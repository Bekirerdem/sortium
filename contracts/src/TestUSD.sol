// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Test collateral for the testnet product. Mainnet uses native USDC instead.
contract TestUSD is ERC20, ERC20Permit, Ownable {
    uint256 public constant DRIP = 1_000e6;
    uint256 public constant COOLDOWN = 1 days;

    mapping(address => uint256) public lastDrip;
    mapping(address => bool) public drippers;

    error Cooldown();
    error NotDripper();
    event DripperSet(address indexed account, bool allowed);

    constructor(address owner_) ERC20("Test USD", "tUSD") ERC20Permit("Test USD") Ownable(owner_) {}

    function decimals() public pure override returns (uint8) { return 6; }

    function faucet() external { _drip(msg.sender); }

    function drip(address to) external {
        if (!drippers[msg.sender]) revert NotDripper();
        _drip(to);
    }

    function setDripper(address account, bool allowed) external onlyOwner {
        drippers[account] = allowed;
        emit DripperSet(account, allowed);
    }

    function _drip(address to) internal {
        uint256 last = lastDrip[to];
        if (last != 0 && block.timestamp < last + COOLDOWN) revert Cooldown();
        lastDrip[to] = block.timestamp;
        _mint(to, DRIP);
    }
}
