// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.7;

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract BookingContract {

    struct Booking {
        string sport;
        string centerName;
        uint amount;
        uint timestamp;
        bool isToken; // true = SPT, false = ETH
    }

    mapping(address => Booking[]) public userBookings;
    address public immutable owner;
    address public immutable tokenAddress;

    // Events
    event NewBooking(
        address indexed user,
        string sport,
        string centerName,
        uint amount,
        uint timestamp
    );

    event BookingCancelled(
        address indexed user,
        string centerName,
        string sport,
        uint256 amount
    );

    /// @notice Contract constructor with token address
    constructor(address _tokenAddress) {
        owner = msg.sender;
        tokenAddress = _tokenAddress;
    }

    /// @notice Book a session using ETH
    function bookSession(string memory _sport, string memory _centerName) external payable {
        require(msg.value > 0, "Booking fee must be greater than 0");

        Booking memory newBooking = Booking({
            sport: _sport,
            centerName: _centerName,
            amount: msg.value,
            timestamp: block.timestamp,
            isToken: false
        });

        userBookings[msg.sender].push(newBooking);
        emit NewBooking(msg.sender, _sport, _centerName, msg.value, block.timestamp);
    }

    /// @notice Book a session using SPT tokens
    function bookWithTokenSession(string memory _sport, string memory _centerName, uint256 _tokenAmount) external {
        require(_tokenAmount > 0, "Token amount must be > 0");

        Booking memory newBooking = Booking({
            sport: _sport,
            centerName: _centerName,
            amount: _tokenAmount,
            timestamp: block.timestamp,
            isToken: true
        });

        userBookings[msg.sender].push(newBooking);
        emit NewBooking(msg.sender, _sport, _centerName, _tokenAmount, block.timestamp);
    }

    /// @notice Cancel a booking and refund ETH or Tokens
    function cancelBooking(uint256 index) public {
        require(index < userBookings[msg.sender].length, "Invalid index");

        Booking storage booking = userBookings[msg.sender][index];
        require(booking.amount > 0, "Already cancelled");

        uint256 refundAmount = booking.amount;
        booking.amount = 0;

        if (booking.isToken) {
            IERC20 token = IERC20(tokenAddress);
            bool success = token.transfer(msg.sender, refundAmount);
            require(success, "Token refund failed");
        } else {
            payable(msg.sender).transfer(refundAmount);
        }

        emit BookingCancelled(msg.sender, booking.centerName, booking.sport, refundAmount);
    }

    /// @notice Get all bookings for a user
    function getBookingsByUser(address _user) external view returns (Booking[] memory) {
        return userBookings[_user];
    }

    /// @notice Number of bookings for a user
    function getBookingCount(address user) external view returns (uint256) {
        return userBookings[user].length;
    }

    /// @notice Contract's ETH balance
    function getContractBalance() external view returns (uint) {
        return address(this).balance;
    }

    /// @notice Contract's token balance
    function getTokenBalance() external view returns (uint256) {
        IERC20 token = IERC20(tokenAddress);
        return token.balanceOf(address(this));
    }

    /// @notice Withdraw ETH to owner
    function withdrawAllETH() external {
        require(msg.sender == owner, "Only owner");
        payable(owner).transfer(address(this).balance);
    }

    /// @notice Withdraw all SPT tokens to owner
    function withdrawTokens() external {
        require(msg.sender == owner, "Only owner");

        IERC20 token = IERC20(tokenAddress);
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "No tokens");

        bool success = token.transfer(owner, balance);
        require(success, "Token transfer failed");
    }
}
