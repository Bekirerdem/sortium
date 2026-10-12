// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {IOptimisticOracleV3} from "./interfaces/IOptimisticOracleV3.sol";
import {IPoolMarkets} from "./interfaces/IPoolMarkets.sol";

/// @notice Posts market outcomes to UMA's Optimistic Oracle V3 and applies the verdict to PoolMarkets.
contract UmaResolver is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint8 public constant VOID_OUTCOME = type(uint8).max;

    IOptimisticOracleV3 public immutable oo;
    IPoolMarkets public immutable markets;
    IERC20 public immutable bondToken;
    bytes32 public immutable identifier;
    uint64 public immutable liveness;
    uint64 public immutable demoLiveness;

    struct Proposal { uint256 marketId; uint8 outcome; address proposer; bool disputed; }
    mapping(bytes32 => Proposal) public proposals;
    mapping(uint256 => bytes32) public activeAssertion;

    error NotOracle();
    error BadOutcome();
    error UnknownAssertion();

    event Proposed(uint256 indexed marketId, bytes32 indexed assertionId, uint8 outcome, address proposer, bytes32 evidenceHash, string evidenceURI);
    event AssertionResolved(uint256 indexed marketId, bytes32 indexed assertionId, bool truthful);
    event AssertionDisputed(uint256 indexed marketId, bytes32 indexed assertionId);

    constructor(address oo_, address markets_, address bondToken_, bytes32 identifier_, uint64 liveness_, uint64 demoLiveness_) {
        oo = IOptimisticOracleV3(oo_);
        markets = IPoolMarkets(markets_);
        bondToken = IERC20(bondToken_);
        identifier = identifier_;
        liveness = liveness_;
        demoLiveness = demoLiveness_;
    }

    function propose(uint256 id, uint8 outcome, bytes32 evidenceHash, string calldata evidenceURI)
        external nonReentrant returns (bytes32 assertionId)
    {
        (bytes memory claim, bool demo) = _buildClaim(id, outcome, evidenceHash, evidenceURI);
        markets.setProposed(id, true); // enforces Locked + resolveTime reached

        uint256 bond = oo.getMinimumBond(address(bondToken));
        bondToken.safeTransferFrom(msg.sender, address(this), bond);
        bondToken.forceApprove(address(oo), bond);

        assertionId = oo.assertTruth(claim, msg.sender, address(this), address(0), demo ? demoLiveness : liveness, bondToken, bond, identifier, bytes32(0));
        proposals[assertionId] = Proposal(id, outcome, msg.sender, false);
        activeAssertion[id] = assertionId;
        emit Proposed(id, assertionId, outcome, msg.sender, evidenceHash, evidenceURI);
    }

    function settle(bytes32 assertionId) external { oo.settleAssertion(assertionId); }

    function assertionResolvedCallback(bytes32 assertionId, bool assertedTruthfully) external {
        if (msg.sender != address(oo)) revert NotOracle();
        Proposal memory p = proposals[assertionId];
        if (p.proposer == address(0)) revert UnknownAssertion();
        delete activeAssertion[p.marketId];
        // never revert here: a reverting callback would block UMA settlement and strand the bond
        if (assertedTruthfully) {
            if (p.outcome == VOID_OUTCOME) {
                try markets.voidMarket(p.marketId) {} catch {}
            } else {
                try markets.finalize(p.marketId, p.outcome) {} catch {}
            }
        } else {
            try markets.setProposed(p.marketId, false) {} catch {}
        }
        emit AssertionResolved(p.marketId, assertionId, assertedTruthfully);
    }

    function assertionDisputedCallback(bytes32 assertionId) external {
        if (msg.sender != address(oo)) revert NotOracle();
        proposals[assertionId].disputed = true;
        emit AssertionDisputed(proposals[assertionId].marketId, assertionId);
    }

    /// @dev Split out of propose() to stay under the stack limit; validates the outcome against the market.
    function _buildClaim(uint256 id, uint8 outcome, bytes32 evidenceHash, string calldata evidenceURI)
        internal view returns (bytes memory claim, bool demo)
    {
        (bytes32 key, uint32 version, bytes32 codeHash, bool demo_, uint8 outcomeCount) = markets.templateOf(id);
        if (outcome >= outcomeCount && outcome != VOID_OUTCOME) revert BadOutcome();
        demo = demo_;
        bytes memory head = abi.encodePacked(
            "PoolMarkets market ", Strings.toString(id), " (template ", _toString(key), " v", Strings.toString(version),
            ", resolver code keccak256 ", Strings.toHexString(uint256(codeHash), 32), ") resolved to "
        );
        bytes memory verdict = outcome == VOID_OUTCOME
            ? bytes("VOID (source unavailable)")
            : abi.encodePacked("outcome index ", Strings.toString(outcome));
        bytes memory tail = abi.encodePacked(
            ". Evidence sha256 ", Strings.toHexString(uint256(evidenceHash), 32), " at ", evidenceURI,
            ". Anyone can verify by running the open resolver code on the evidence."
        );
        claim = bytes.concat(head, verdict, tail);
    }

    function _toString(bytes32 b) internal pure returns (string memory) {
        uint256 len;
        while (len < 32 && b[len] != 0) len++;
        bytes memory out = new bytes(len);
        for (uint256 i; i < len; i++) out[i] = b[i];
        return string(out);
    }
}
