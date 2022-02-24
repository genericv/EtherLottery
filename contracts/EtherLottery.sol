// SPDX-License-Identifier: GPL-3.0
pragma solidity >= 0.8.2 < 0.9.0;

import "./LotToken.sol";

contract EtherLottery {

    // Associated token contract address.
    // Used to handle ticket buying process.
    address public tokenContractAddress;

    // Accounts that have bought tickets.
    address[] private players;

    // Receives 10% of the reward.
    // Set to the deployer's address.
    address public beneficiary;

    // Receives 90% of the reward.
    // Randomly selected from players at the end.
    // Player with more tickets has a higher chance
    // to be selected.
    address winner;
    
    // Total supply of tickets that can be sold
    // before the lottery ends.
    // Set by deployer.
    uint public ticketSupply;

    // Amount of remaining available tickets.
    // Initialy set to the total ticket supply.
    // Decreased by the number of sold tickets.
    uint public ticketPool;

    // Price of one ticket in associated tokens.
    uint public ticketPrice;

    // Time when the lottery ends.
    // Set by deployer.
    uint public endTime;

    // Set to true at the end, disallows any change.
    // By default initialized to `false`.
    bool ended;

    // Maps players' addresses to their ticket amounts.
    mapping(address => uint) balances;

    // Emitted at the end.
    // Announces the winner and their reward.
    event LotteryEnded(address winner, uint amount);

    /** 
    * @notice Create new lottery with provided parameters.
    * @param _tokenContractAddress associated token contract address
    * @param _ticketPrice price of one ticket in associated tokens
    * @param _ticketSupply total ticket supply
    * @param _duration time period in seconds
    * @dev sets beneficiary to the current sender (deployer)
    * @dev set end time to the sum of the current time and the duration
    */
    constructor(address _tokenContractAddress, uint _ticketPrice, uint _ticketSupply, uint _duration) {
        beneficiary = payable(msg.sender);
        tokenContractAddress = _tokenContractAddress;
        ticketPrice =_ticketPrice;
        ticketSupply = _ticketSupply;
        ticketPool = _ticketSupply;
        endTime = block.timestamp + _duration;
    }

    /**
    * @notice Calculate winner's and beneficiary's rewards.
    * @return two reward values as a tuple: (forWinner, forBeneficiary)
    */
    function getRewards() public view returns(uint, uint){
        uint totalReward = (ticketSupply - ticketPool) * ticketPrice;
        uint forWinner = totalReward / 10 * 9;
        uint forBeneficiary = totalReward - forWinner;
        return (forWinner, forBeneficiary);
    }

    /**
    * @notice Get the winner's address.
    * @return winner's address
    */
    function getWinner() external view returns(address){
        require(ended, "The lottery has not ended yet.");
        return winner;
    }

    /**
    * @notice Get the current account's number of tickets.
    * @return current sender's ticket amount
    * @dev will return 0 even if the sender is not in the players list
    */
    function getTicketAmount() external view returns(uint){
        return balances[msg.sender];
    }

    /**
    * @notice Determine the winner.
    * @dev select the winner by determining a winning ticket
    * @dev random number is generated using keccak256
    * @dev keccak256 applies to timestamp and sender's address
    * @dev stores winner's address in state variable
    */
    function determineWinner() internal{
        uint winningNumber = uint(
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    msg.sender
                )
            )
        ) % (ticketSupply - ticketPool) + 1;
        for (uint i = 0; i < players.length; i++){
            if (balances[players[i]] >= winningNumber){
                winner = payable(players[i]);
                break;
            }
            winningNumber -= balances[players[i]];
        }
    }

    /**
    * @notice Credit tickets to a player at cost of appropriate token amount.
    * @param _playerAddress address of a player that tickets will be credited to
    * @param _ticketAmount amount of tickets to be credited
    * @dev transfers specified amount of tickets from the pool to the player
    * @dev transfers appropriate number of player's approved tokens to the lottery
    */
    function creditTickets(address _playerAddress, uint _ticketAmount) external {
        require(!ended, "The lottery has already ended.");
        require(block.timestamp <= endTime, "The ticket buying period has already ended.");
        require(_ticketAmount <= ticketPool, "The requested number of tickets exceeds current available count.");
        // Transfer the appropriate amount of tokens
        // from sender to the lottery balance
        LotToken tockenContract = LotToken(tokenContractAddress);
        tockenContract.transferFrom(_playerAddress, address(this), _ticketAmount * ticketPrice);
        // Add new player to the list.
        if (balances[_playerAddress] == 0){
            players.push(_playerAddress);
        }
        // Increase buyer's ticket balance.
        balances[_playerAddress] += _ticketAmount;
        ticketPool -= _ticketAmount;
    }

    /**
    * @notice End the lottery when time is up or all the tickets are bought.
    * @dev send rewards to winner and beneficiary
    */
    function endLottery() external {
        // Conditions
        require(!ended, "The lottery ending has already been requested.");
        require(ticketPool == 0 || block.timestamp >= endTime, "The lottery has not ended yet.");

        // Effects
        ended = true;
        determineWinner();
        (uint playerReward, uint beneficiaryReward) = getRewards();
        emit LotteryEnded(winner, playerReward);

        // Interaction
        LotToken tockenContract = LotToken(tokenContractAddress);
        tockenContract.transfer(winner, playerReward);
        tockenContract.transfer(beneficiary, beneficiaryReward);
    }

}
