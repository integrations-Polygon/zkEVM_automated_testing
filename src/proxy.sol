// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract Proxy is Initializable, OwnableUpgradeable {

    uint256 val=5;

    function initialize() public initializer {
        __Ownable_init_unchained();
        val=5;
    }

    function value() public view returns (uint256) {
        return val;
    }

    function set_value(uint256 _val) public {
        val= _val;
    }
}