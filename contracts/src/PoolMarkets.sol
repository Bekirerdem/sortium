// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @notice Pool-bet (parimutuel) markets opened from registered templates and resolved by a resolver contract.
contract PoolMarkets is Ownable2Step, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    enum State { Open, Locked, Proposed, Resolved, Void }

    struct Template {
        bytes32 key;
        uint32 version;
        bytes32 codeHash;
        bytes32 rulesHash;
        string rulesURI;
        bool demo;
    }

    struct Market {
        uint64 templateId;
        uint64 lockTime;
        uint64 resolveTime;
        uint8 outcomeCount;
        uint8 winningOutcome;
        bool proposed;
        bool resolved;
        bool voided;
        uint256 totalPool;
        bytes32 metaHash;
    }

    uint256 public constant FEE_BPS = 200;
    uint256 public constant MIN_BET = 1e6;
    uint256 public constant MAX_STAKE_PER_MARKET = 500e6;
    uint256 public constant MAX_OUTCOMES = 16;
    uint256 public constant STALE_AFTER = 7 days;

    IERC20 public immutable collateral;
    address public treasury;
    address public resolver;
    uint256 public accruedFees;

    mapping(address => bool) public operators;
    Template[] internal _templates;
    Market[] internal _markets;
    mapping(uint256 => uint256[MAX_OUTCOMES]) internal _pools;
    mapping(uint256 => mapping(address => uint256[MAX_OUTCOMES])) internal _stakes;
    mapping(uint256 => mapping(address => uint256)) public totalStakeOf;
    mapping(uint256 => mapping(address => bool)) public claimed;

    error NotOperator();
    error NotResolver();
    error UnknownTemplate();
    error UnknownMarket();
    error BadOutcomes();
    error BadOutcome();
    error BadTimes();
    error NotOpen();
    error BetTooSmall();
    error StakeCapExceeded();
    error BadState();
    error TooEarly();
    error NothingToClaim();
    error ZeroAddress();

    event TemplateRegistered(uint64 indexed templateId, bytes32 key, uint32 version, bytes32 codeHash, bytes32 rulesHash, string rulesURI, bool demo);
    event MarketCreated(uint256 indexed id, uint64 indexed templateId, string question, string[] outcomes, uint64 lockTime, uint64 resolveTime, bytes32 metaHash);
    event BetPlaced(uint256 indexed id, address indexed user, uint8 outcome, uint256 amount);
    event ProposedSet(uint256 indexed id, bool proposed);
    event MarketResolved(uint256 indexed id, uint8 outcome, uint256 fee);
    event MarketVoided(uint256 indexed id);
    event Claimed(uint256 indexed id, address indexed user, uint256 amount);
    event OperatorSet(address indexed account, bool allowed);
    event ResolverSet(address indexed resolver);
    event TreasurySet(address indexed treasury);

    modifier onlyOperator() { if (!operators[msg.sender]) revert NotOperator(); _; }
    modifier onlyResolver() { if (msg.sender != resolver) revert NotResolver(); _; }
    modifier exists(uint256 id) { if (id >= _markets.length) revert UnknownMarket(); _; }

    constructor(address collateral_, address treasury_, address owner_) Ownable(owner_) {
        if (collateral_ == address(0) || treasury_ == address(0)) revert ZeroAddress();
        collateral = IERC20(collateral_);
        treasury = treasury_;
    }

    // ---------- admin ----------
    function registerTemplate(bytes32 key, uint32 version, bytes32 codeHash, bytes32 rulesHash, string calldata rulesURI, bool demo)
        external onlyOwner returns (uint64 templateId)
    {
        templateId = uint64(_templates.length);
        _templates.push(Template(key, version, codeHash, rulesHash, rulesURI, demo));
        emit TemplateRegistered(templateId, key, version, codeHash, rulesHash, rulesURI, demo);
    }

    function setOperator(address account, bool allowed) external onlyOwner { operators[account] = allowed; emit OperatorSet(account, allowed); }
    function setResolver(address resolver_) external onlyOwner { if (resolver_ == address(0)) revert ZeroAddress(); resolver = resolver_; emit ResolverSet(resolver_); }
    function setTreasury(address treasury_) external onlyOwner { if (treasury_ == address(0)) revert ZeroAddress(); treasury = treasury_; emit TreasurySet(treasury_); }
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function withdrawFees() external {
        uint256 amount = accruedFees;
        accruedFees = 0;
        collateral.safeTransfer(treasury, amount);
    }

    // ---------- markets ----------
    function createMarket(uint64 templateId, string calldata question, string[] calldata outcomes, uint64 lockTime, uint64 resolveTime, bytes32 metaHash)
        external onlyOperator whenNotPaused returns (uint256 id)
    {
        if (templateId >= _templates.length) revert UnknownTemplate();
        if (outcomes.length < 2 || outcomes.length > MAX_OUTCOMES) revert BadOutcomes();
        if (lockTime <= block.timestamp || resolveTime < lockTime) revert BadTimes();
        id = _markets.length;
        _markets.push(Market({
            templateId: templateId, lockTime: lockTime, resolveTime: resolveTime, outcomeCount: uint8(outcomes.length),
            winningOutcome: 0, proposed: false, resolved: false, voided: false, totalPool: 0, metaHash: metaHash
        }));
        emit MarketCreated(id, templateId, question, outcomes, lockTime, resolveTime, metaHash);
    }

    function bet(uint256 id, uint8 outcome, uint256 amount) external nonReentrant whenNotPaused exists(id) {
        _bet(id, outcome, amount);
    }

    function betWithPermit(uint256 id, uint8 outcome, uint256 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s)
        external nonReentrant whenNotPaused exists(id)
    {
        // permit may have been front-run; the transferFrom below still enforces allowance
        try IERC20Permit(address(collateral)).permit(msg.sender, address(this), amount, deadline, v, r, s) {} catch {}
        _bet(id, outcome, amount);
    }

    function _bet(uint256 id, uint8 outcome, uint256 amount) internal {
        if (state(id) != State.Open) revert NotOpen();
        Market storage m = _markets[id];
        if (outcome >= m.outcomeCount) revert BadOutcome();
        if (amount < MIN_BET) revert BetTooSmall();
        uint256 newTotal = totalStakeOf[id][msg.sender] + amount;
        if (newTotal > MAX_STAKE_PER_MARKET) revert StakeCapExceeded();
        totalStakeOf[id][msg.sender] = newTotal;
        _stakes[id][msg.sender][outcome] += amount;
        _pools[id][outcome] += amount;
        m.totalPool += amount;
        emit BetPlaced(id, msg.sender, outcome, amount);
        collateral.safeTransferFrom(msg.sender, address(this), amount);
    }

    // ---------- resolution ----------
    function setProposed(uint256 id, bool proposed) external onlyResolver exists(id) {
        Market storage m = _markets[id];
        if (proposed) {
            if (state(id) != State.Locked) revert BadState();
            if (block.timestamp < m.resolveTime) revert TooEarly();
        } else {
            if (!m.proposed || m.resolved || m.voided) revert BadState();
        }
        m.proposed = proposed;
        emit ProposedSet(id, proposed);
    }

    function finalize(uint256 id, uint8 outcome) external onlyResolver exists(id) {
        Market storage m = _markets[id];
        if (!m.proposed || m.resolved || m.voided) revert BadState();
        if (outcome >= m.outcomeCount) revert BadOutcome();
        if (_pools[id][outcome] == 0) {
            m.voided = true;
            emit MarketVoided(id);
            return;
        }
        m.resolved = true;
        m.winningOutcome = outcome;
        uint256 fee = (m.totalPool * FEE_BPS) / 10_000;
        accruedFees += fee;
        emit MarketResolved(id, outcome, fee);
    }

    /// @notice Resolver voids on a "source unavailable" outcome; anyone may void a market nobody resolved within STALE_AFTER.
    function voidMarket(uint256 id) external exists(id) {
        Market storage m = _markets[id];
        if (m.resolved || m.voided) revert BadState();
        if (msg.sender != resolver) {
            if (m.proposed) revert BadState();
            if (block.timestamp <= uint256(m.resolveTime) + STALE_AFTER) revert TooEarly();
        }
        m.voided = true;
        emit MarketVoided(id);
    }

    function claim(uint256 id) external nonReentrant exists(id) returns (uint256 amount) {
        amount = previewClaim(id, msg.sender);
        if (amount == 0) revert NothingToClaim();
        claimed[id][msg.sender] = true;
        emit Claimed(id, msg.sender, amount);
        collateral.safeTransfer(msg.sender, amount);
    }

    // ---------- views ----------
    function previewClaim(uint256 id, address user) public view exists(id) returns (uint256) {
        if (claimed[id][user]) return 0;
        Market storage m = _markets[id];
        if (m.voided) return totalStakeOf[id][user];
        if (!m.resolved) return 0;
        uint256 stake = _stakes[id][user][m.winningOutcome];
        if (stake == 0) return 0;
        uint256 distributable = m.totalPool - (m.totalPool * FEE_BPS) / 10_000;
        return (stake * distributable) / _pools[id][m.winningOutcome];
    }

    function state(uint256 id) public view exists(id) returns (State) {
        Market storage m = _markets[id];
        if (m.voided) return State.Void;
        if (m.resolved) return State.Resolved;
        if (m.proposed) return State.Proposed;
        if (block.timestamp >= m.lockTime) return State.Locked;
        return State.Open;
    }

    function marketCount() external view returns (uint256) { return _markets.length; }
    function templateCount() external view returns (uint256) { return _templates.length; }
    function getMarket(uint256 id) external view exists(id) returns (Market memory) { return _markets[id]; }
    function getTemplate(uint64 templateId) external view returns (Template memory) { return _templates[templateId]; }

    function outcomePoolsOf(uint256 id) external view exists(id) returns (uint256[] memory pools) {
        uint8 n = _markets[id].outcomeCount;
        pools = new uint256[](n);
        for (uint256 i; i < n; i++) pools[i] = _pools[id][i];
    }

    function stakesOf(uint256 id, address user) external view exists(id) returns (uint256[] memory stakes) {
        uint8 n = _markets[id].outcomeCount;
        stakes = new uint256[](n);
        for (uint256 i; i < n; i++) stakes[i] = _stakes[id][user][i];
    }

    function templateOf(uint256 id) external view exists(id) returns (bytes32 key, uint32 version, bytes32 codeHash, bool demo, uint8 outcomeCount) {
        Market storage m = _markets[id];
        Template storage t = _templates[m.templateId];
        return (t.key, t.version, t.codeHash, t.demo, m.outcomeCount);
    }
}
