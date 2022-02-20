// SPDX-License-Identifier: GPL-3.0
pragma solidity >= 0.8.4 < 0.9.0;
contract EtherLottery {

    // Accounts that have bought tickets.
    address[] private players;

    // Receives 10% of the reward.
    // Set to the deployer's address.
    address payable public beneficiary;

    // Receives 90% of the reward.
    // Randomly selected from players at the end.
    // Player with more tickets has a higher chance
    // to be selected.
    address payable winner;
    
    // Total supply of tickets that can be sold
    // before the lottery ends.
    // Set by deployer.
    uint public ticketSupply;

    // Amount of remaining available tickets.
    // Initialy set to the total ticket supply.
    // Decreased by the number of sold tickets.
    uint public ticketPool;

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

    /// The lottery has already ended.
    error LotteryAlreadyEnded();
    /// Specified amount is zero.
    error NoEtherSent();
    /// Only `availableAmount` tickets left.
    error SentTooMuch(uint availableAmount);
    /// The lottery has not ended yet.
    error LotteryNotYetEnded();
    /// The function endLottery has already been called.
    error LotteryEndAlreadyCalled();

    /** 
    * @notice Create new lottery with provided parameters.
    * @param _ticketSupply total ticket supply
    * @param _duration time period in seconds
    * @dev sets beneficiary to the current sender (deployer)
    * @dev set end time to the sum of the current time and the duration
    */
    constructor(uint _ticketSupply, uint _duration) {
        beneficiary = payable(msg.sender);
        ticketSupply = _ticketSupply;
        ticketPool = _ticketSupply;
        endTime = block.timestamp + _duration;
    }

    /**
    * @notice Calculate winner's and beneficiary's rewards.
    * @return two reward values as a tuple: (forWinner, forBeneficiary)
    */
    function getRewards() public view returns(uint, uint){
        uint totalReward = address(this).balance;
        uint forWinner = totalReward / 10 * 9;
        uint forBeneficiary = totalReward - forWinner;
        return (forWinner, forBeneficiary);
    }

    /**
    * @notice Get the winner's address.
    * @return winner's address
    */
    function getWinner() external view returns(address){
        if(!ended) {
            revert LotteryNotYetEnded();
        }
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
        uint winningNumber = uint(keccak256(abi.encodePacked(block.timestamp, msg.sender))) % ticketSupply + 1;
        for (uint i = 0; i < players.length; i++){
            if (balances[players[i]] >= winningNumber){
                winner = payable(players[i]);
                break;
            }
            winningNumber -= balances[players[i]];
        }
    }

    /**
    * @notice Buy lottery tickets.
    * @dev purchased tokens number is equal to sent ether value
    */
    function buyTickets() external payable {
        // Revert if the lottery has already ended
        // or if the ticket buying period is over.
        if (ended || block.timestamp > endTime){
            revert LotteryAlreadyEnded();
        }
        // Revert if player sent zero ether.
        if (msg.value <= 0) {
            revert NoEtherSent();
        }
        // Revert if player sent more ether
        // than there are available tickets.
        if (ticketPool < msg.value) {
            revert SentTooMuch(ticketPool);
        }
        // Add new player to the list.
        if (balances[msg.sender] == 0){
            players.push(msg.sender);
        }
        // Increase buyer's ticket balance.
        balances[msg.sender] += msg.value;
        ticketPool -= msg.value;
    }

    /**
    * @notice End the lottery when time is up or all the tickets are bought.
    * @dev send rewards to winner and beneficiary
    */
    function endLottery() external {
        // Conditions
        if (ended){
            revert LotteryEndAlreadyCalled();
        }
        if (ticketPool > 0 && block.timestamp < endTime){
            revert LotteryNotYetEnded();
        }

        // Effects
        ended = true;
        determineWinner();
        (uint playerReward, uint beneficiaryReward) = getRewards();
        emit LotteryEnded(winner, playerReward);

        // Interaction
        winner.transfer(playerReward);
        beneficiary.transfer(beneficiaryReward);
    }

}
