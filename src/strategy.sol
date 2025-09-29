// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.4.0
pragma solidity ^0.8.27;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Strategy is Initializable, PausableUpgradeable, AccessControlUpgradeable {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    struct ActionParamRole {
        uint8 index;
        bool onlySender;
    }

    mapping(address => bytes4[]) public actions;
    mapping(address => mapping(bytes4 => ActionParamRole[])) public actionParamRoles;

    error SelectorAlreadyExists(address target, bytes4 selector);
    error ActionNotFound(address target, bytes4 selector);
    error InvalidData(bytes data);
    error ExecuteFailed(address target, bytes4 selector);
    error ActionParamRoleAlreadyExists(address target, bytes4 selector, uint8 index);
    error ActionParamRoleNotFound(address target, bytes4 selector, uint8 index);
    error ActionParamRoleInvalid(address target, bytes4 selector, uint8 index);

    event ActionAdded(address target, bytes4 selector);
    event ActionRemoved(address target, bytes4 selector);
    event ActionParamRoleAdded(address target, bytes4 selector, uint8 index, bool onlySender);
    event ActionParamRoleRemoved(address target, bytes4 selector, uint8 index);
    event ActionExecuted(address target, bytes data);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address defaultAdmin, address operator) public initializer {
        __Pausable_init();
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(OPERATOR_ROLE, operator);
    }

    function execute(address target, bytes4 selector, bytes calldata data) public whenNotPaused {
        // get selector from data
        if (data.length < 4) {
            revert InvalidData(data);
        }
        bytes4 selectorInData = bytes4(data[0:4]);
        if (selectorInData != selector) {
            revert InvalidData(data);
        }

        // check if selector is in actions
        bool selectorFound = false;
        for (uint256 i = 0; i < actions[target].length; i++) {
            if (actions[target][i] == selector) {
                selectorFound = true;
                break;
            }
        }
        if (!selectorFound) {
            revert ActionNotFound(target, selector);
        }

        // check if param roles are valid
        uint256 roleLength = actionParamRoles[target][selector].length;
        for (uint256 i = 0; i < roleLength; i++) {
            uint256 paramIndex = actionParamRoles[target][selector][i].index;
            bool onlySender = actionParamRoles[target][selector][i].onlySender;

            bytes32 param = bytes32(data[4 + paramIndex * 32:((paramIndex + 1) * 32) + 4]);
            if (onlySender && msg.sender != address(uint160(uint256(param)))) {
                revert ActionParamRoleInvalid(target, selector, uint8(paramIndex));
            }
        }

        (bool success, ) = target.call(data);
        if (!success) {
            revert ExecuteFailed(target, selector);
        }
        emit ActionExecuted(target, data);
    }

    function addAction(address target, bytes4 selector) public onlyRole(OPERATOR_ROLE) {
        //check if selector is already in actions
        for (uint256 i = 0; i < actions[target].length; i++) {
            if (actions[target][i] == selector) {
                revert SelectorAlreadyExists(target, selector);
            }
        }
        actions[target].push(selector);
        emit ActionAdded(target, selector);
    }

    function removeAction(address target, bytes4 selector) public onlyRole(OPERATOR_ROLE) {
        for (uint256 i = 0; i < actions[target].length; i++) {
            if (actions[target][i] == selector) {
                actions[target][i] = actions[target][actions[target].length - 1];
                actions[target].pop();
                emit ActionRemoved(target, selector);
                return;
            }
        }
        revert ActionNotFound(target, selector);
    }

    function addActionParamRole(
        address target,
        bytes4 selector,
        uint8 index,
        bool onlySender
    ) public onlyRole(OPERATOR_ROLE) {
        for (uint256 i = 0; i < actionParamRoles[target][selector].length; i++) {
            if (actionParamRoles[target][selector][i].index == index) {
                revert ActionParamRoleAlreadyExists(target, selector, index);
            }
        }
        actionParamRoles[target][selector].push(ActionParamRole(index, onlySender));
        emit ActionParamRoleAdded(target, selector, index, onlySender);
    }

    function removeActionParamRole(
        address target,
        bytes4 selector,
        uint8 index
    ) public onlyRole(OPERATOR_ROLE) {
        for (uint256 i = 0; i < actionParamRoles[target][selector].length; i++) {
            if (actionParamRoles[target][selector][i].index == index) {
                actionParamRoles[target][selector][i] = actionParamRoles[target][selector][
                    actionParamRoles[target][selector].length - 1
                ];
                actionParamRoles[target][selector].pop();
                emit ActionParamRoleRemoved(target, selector, index);
                return;
            }
        }
        revert ActionParamRoleNotFound(target, selector, index);
    }

    function pause() public onlyRole(OPERATOR_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(OPERATOR_ROLE) {
        _unpause();
    }

    function withdrawERC20(
        address token,
        address to,
        uint256 amount
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC20(token).transfer(to, amount);
    }

    function withdrawETH(address to, uint256 amount) public onlyRole(DEFAULT_ADMIN_ROLE) {
        (bool success, ) = to.call{value: amount}("");
        if (!success) {
            revert ExecuteFailed(to, 0x00000000);
        }
    }

    receive() external payable {}

    function getActionParamRoles(
        address target,
        bytes4 selector
    ) public view returns (ActionParamRole[] memory) {
        return actionParamRoles[target][selector];
    }

    function getActions(address target) public view returns (bytes4[] memory) {
        return actions[target];
    }

    function actionParamRolesLength(address target, bytes4 selector) public view returns (uint256) {
        return actionParamRoles[target][selector].length;
    }

    function actionsLength(address target) public view returns (uint256) {
        return actions[target].length;
    }
}
