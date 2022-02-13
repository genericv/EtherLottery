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
    /// The function lotteryEnd has already been called.
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
        endTime = block.timestamp + _duration;
    }

    /**
    * @notice Calculate winner's and beneficiary's rewards.
    * @return two reward values as a tuple: (forWinner, forBeneficiary)
    */
    function getRewards() public view returns(uint, uint){}

    /**
    * @notice Get the winner's address.
    * @return winner's address
    */
    function getWinner() external view returns(address){}

    /**
    * @notice Get the current account's number of tickets.
    * @return current sender's ticket amount
    * @dev will return 0 even if the sender is not in the players list
    */
    function getTicketAmount() external view returns(uint){}

    /**
    * @notice Determine the winner.
    * @dev select the winner by determining a winning ticket
    * @dev random number is generated using keccak256
    * @dev keccak256 applies to timestamp and sender's address
    */
    function determineWinner() internal{}

    /**
    * @notice Buy lottery tickets.
    * @dev purchased tokens number is equal to sent ether value
    */
    function buyTickets() external payable {}

    /**
    * @notice End the lottery when time is up or all the tickets are bought.
    * @dev send rewards to winner and beneficiary
    */
    function lotteryEnd() external {}

}