// SPDX-License-Identifier: MIT

pragma solidity >= 0.8.2 < 0.9.0;

import "../node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract LotToken is ERC20 {
    // Owner account address.
    address public owner;

    /** 
    * @notice Create LotTokens.
    * @param _initialSupply initial token supply to be minted
    * @dev sets owner to the current sender (deployer)
    * @dev mints initial token supply and assigns it to the owner
    */
    constructor(uint _initialSupply) ERC20("LotToken", "LTT"){
        _mint(msg.sender, _initialSupply);
        owner = msg.sender;
    }

    /** 
    * @notice Transfer tokens to another account.
    * @param recipient address of the receiver
    * @param amount number of tokens to be transferred
    * @return true if transaction was successful
    */
    function transfer(address recipient, uint256 amount) public override returns (bool) {
        require(amount > 0, "Can not transfer zero tokens");
        require(balanceOf(msg.sender) >= amount, "Not enough tokens");
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

}