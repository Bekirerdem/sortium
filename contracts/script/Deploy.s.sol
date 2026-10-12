// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {Script, console2} from "forge-std/Script.sol";
import {TestUSD} from "../src/TestUSD.sol";
import {PoolMarkets} from "../src/PoolMarkets.sol";
import {UmaResolver} from "../src/UmaResolver.sol";

interface IDBT { function allocateTo(address, uint256) external; function approve(address, uint256) external returns (bool); }

contract Deploy is Script {
    address constant OO = 0x1037A21a30aEfF90c269b01c3933eB9a5285d9b8;
    address constant DBT = 0x689FF0D2c17ECbB01477420aB18482A8DAd45186;

    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address me = vm.addr(pk);
        vm.startBroadcast(pk);
        TestUSD usd = new TestUSD(me);
        PoolMarkets pm = new PoolMarkets(address(usd), me, me);
        UmaResolver ur = new UmaResolver(OO, address(pm), DBT, "ASSERT_TRUTH", 7200, 300);
        pm.setResolver(address(ur));
        pm.setOperator(me, true);
        usd.setDripper(me, true);
        IDBT(DBT).allocateTo(me, 100_000e18);
        IDBT(DBT).approve(address(ur), type(uint256).max);
        vm.stopBroadcast();
        console2.log("TUSD", address(usd));
        console2.log("POOL_MARKETS", address(pm));
        console2.log("UMA_RESOLVER", address(ur));
    }
}
