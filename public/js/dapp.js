let signer, bookingContract, reviewContract, nftContract, tokenContract;

const bookingContractAddress = "0x23ffa98c99dfcbf03d2dfe0781b76417ac491bee";
const reviewContractAddress = "0x8b0979591caf02f4efbce863179f8a8bbc3a70b2";
const nftContractAddress = "0xf81f017fd4c16c0f8d4fef2e9b5cb56d540a9d31";
const tokenContractAddress = "0xe1dbc7e05ea5c5ba271bbdc87535a60474db953c";

// Load ABIs dynamically
async function loadABIs() {
  const [bookingABI, reviewABI, nftABI, tokenABI] = await Promise.all([
    fetch("/abi/booking_abi.json").then(res => res.json()),
    fetch("/abi/review_abi.json").then(res => res.json()),
    fetch("/abi/nft_abi.json").then(res => res.json()),
    fetch("/abi/token_abi.json").then(res => res.json())
  ]);

  bookingContract = new ethers.Contract(bookingContractAddress, bookingABI, signer);
  reviewContract = new ethers.Contract(reviewContractAddress, reviewABI, signer);
  nftContract = new ethers.Contract(nftContractAddress, nftABI, signer);
  tokenContract = new ethers.Contract(tokenContractAddress, tokenABI, signer);
}

async function connectWallet() {
  if (!window.ethereum) return alert("Install MetaMask!");

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  signer = provider.getSigner();

  const address = await signer.getAddress();
  document.getElementById("walletAddress").innerText = "Connected: " + address;

  await loadABIs();

  displayTokenBalance();

}

async function loadTokenAbi() {
    const response = await fetch('/path/to/token_abi.json');
    return await response.json();
}

async function initializeTokenContract() {
    const tokenAbi = await loadTokenAbi();
    tokenContract = new ethers.Contract(tokenContractAddress, tokenAbi, signer);
}

async function displayTokenBalance() {
    const address = await signer.getAddress();
    const balance = await tokenContract.balanceOf(address);
    const formattedBalance = ethers.utils.formatUnits(balance, 18);
    document.getElementById('tokenBalance').innerText = `Token Balance: ${formattedBalance} SPT`;
}

async function sendTokens(recipientAddress, amount) {
    const tx = await tokenContract.transfer(recipientAddress, ethers.utils.parseUnits(amount, 18));
    await tx.wait();
    alert('Transaction successful');
    displayTokenBalance(); // Refresh balance
}


function saveUserProfile(event) {
  event.preventDefault();
  const profile = {
    name: document.getElementById("profileName").value,
    email: document.getElementById("profileEmail").value,
    sport: document.getElementById("profileSport").value
  };
  localStorage.setItem("userProfile", JSON.stringify(profile));
  bootstrap.Modal.getInstance(document.getElementById("profileModal")).hide();
  alert("✅ Profile saved!");
}

async function bookSession(event, form) {
  event.preventDefault();
  if (!signer || !bookingContract) return alert("Connect wallet first.");

  const centerName = form.dataset.centerName;
  const sport = form.dataset.sport;
  const id = form.dataset.centerId;
  const minFee = parseFloat(form.dataset.bookingFee || "0.001");
  const ethValue = parseFloat(document.getElementById(`fee${id}`).value);
  const msg = document.getElementById(`bookingMsg${id}`);

  if (isNaN(ethValue) || ethValue < minFee) {
    msg.innerText = `❌ Minimum payment is ${minFee} ETH.`;
    return;
  }

  try {
    const tx = await bookingContract.bookSession(sport, centerName, {
      value: ethers.utils.parseEther(ethValue.toString())
    });
    msg.innerText = "⏳ Processing...";
    const receipt = await tx.wait();
    msg.innerText = receipt.status === 1 ? "✅ Booking successful!" : "❌ Booking reverted!";
  } catch (err) {
    console.error(err);
    msg.innerText = "❌ Transaction failed or cancelled.";
  }
}

async function addReview(event, centerName, id) {
  event.preventDefault();
  if (!signer || !reviewContract) return alert("Connect wallet first.");
  const message = document.getElementById(`reviewMessage${id}`).value;
  const rating = parseInt(document.getElementById(`reviewRating${id}`).value);
  const list = document.getElementById(`reviewList${id}`);
  const status = document.getElementById(`reviewMsg${id}`);

  try {
    const tx = await reviewContract.addReview(centerName, message, rating);
    status.innerText = "Submitting...";
    await tx.wait();
    status.innerText = "✅ Submitted!";
    const li = document.createElement("li");
    li.textContent = `🗣️ ${message} (⭐${rating})`;
    list.appendChild(li);
  } catch (err) {
    console.error(err);
    status.innerText = "❌ Error submitting review.";
  }
}

async function loadReviews(centerName, id) {
  if (!signer || !reviewContract) return;
  const list = document.getElementById(`reviewList${id}`);
  list.innerHTML = "";

  try {
    const reviews = await reviewContract.getReviews(centerName);
    reviews.forEach(r => {
      const li = document.createElement("li");
      li.textContent = `🗣️ ${r.message} (⭐${r.rating})`;
      list.appendChild(li);
    });
  } catch (err) {
    console.error(err);
  }
}

async function sendTokenHandler(event) {
    event.preventDefault();
    const address = document.getElementById("recipientAddress").value.trim();
    const amount = document.getElementById("tokenAmount").value.trim();
    if (!ethers.utils.isAddress(address)) return alert("Invalid address.");
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) return alert("Invalid amount.");
    await sendTokens(address, amount);
  }
  window.sendTokenHandler = sendTokenHandler;
  
  async function bookWithToken(event, form) {
    event.preventDefault();
    if (!signer || !tokenContract || !bookingContract) return alert("Connect wallet first.");
  
    const centerName = form.dataset.centerName;
    const sport = form.dataset.sport;
    const id = form.dataset.centerId;
    const tokenAmount = parseFloat(document.getElementById(`tokenFee${id}`).value);
    const msg = document.getElementById(`tokenBookingMsg${id}`);
  
    if (isNaN(tokenAmount) || tokenAmount <= 0) {
      msg.innerText = "❌ Invalid token amount.";
      return;
    }
  
    try {
      msg.innerText = "⏳ Approving token transfer...";
  
      const amountInWei = ethers.utils.parseUnits(tokenAmount.toString(), 18);
  
      // Transfer tokens first
      const tx1 = await tokenContract.transfer(bookingContractAddress, amountInWei);
      await tx1.wait();
  
      msg.innerText = "⏳ Confirming booking...";
  
      // Then call smart contract method to log booking
      const tx2 = await bookingContract.bookWithTokenSession(sport, centerName, amountInWei);
      const receipt = await tx2.wait();
  
      msg.innerText = receipt.status === 1 ? "✅ Booking successful with token!" : "❌ Booking reverted!";
    } catch (err) {
      console.error(err);
      msg.innerText = "❌ Token booking failed.";
    }
  }
  window.bookWithToken = bookWithToken;
  
  

let bookingIndexMap = [];

async function showMyBookings() {
  if (!signer || !bookingContract) return alert("Connect wallet first.");

  const user = await signer.getAddress();
  const list = document.getElementById("myBookingsList");
  const modal = new bootstrap.Modal(document.getElementById("bookingsModal"));
  list.innerHTML = "";
  bookingIndexMap = [];

  try {
    const bookings = await bookingContract.getBookingsByUser(user);
    let activeFound = false;

    for (let i = 0; i < bookings.length; i++) {
      const b = await bookingContract.userBookings(user, i);
      if (b.amount.toString() === "0") continue;

      activeFound = true;
      bookingIndexMap.push(i);

      const amount = ethers.utils.formatEther(b.amount);
      const time = new Date(b.timestamp * 1000).toLocaleString();

      const li = document.createElement("li");
      li.className = "list-group-item d-flex justify-content-between align-items-center";
      li.innerHTML = `
        <div>
          <strong>${b.sport}</strong> – ${b.centerName}<br>
          ${amount} ETH at ${time}
        </div>
        <button class="btn btn-danger btn-sm" onclick="cancelBooking(${bookingIndexMap.length - 1})">Cancel</button>
      `;
      list.appendChild(li);
    }

    if (!activeFound) {
      const li = document.createElement("li");
      li.className = "list-group-item text-muted";
      li.innerText = "No active bookings.";
      list.appendChild(li);
    }

    modal.show();
  } catch (err) {
    console.error("❌ Error fetching bookings:", err);
    alert("Something went wrong while loading bookings.");
  }
}

async function cancelBooking(indexInMap) {
  if (!signer || !bookingContract) return alert("Connect wallet first.");

  try {
    const actualIndex = bookingIndexMap[indexInMap];
    const gasEstimate = await bookingContract.estimateGas.cancelBooking(actualIndex);
    const tx = await bookingContract.cancelBooking(actualIndex, { gasLimit: gasEstimate });
    const receipt = await tx.wait();

    if (receipt.status === 1) {
      alert("✅ Booking cancelled and ETH or token refunded.");
      showMyBookings();
    } else {
      alert("❌ Cancellation failed.");
    }
  } catch (err) {
    console.error("❌ Cancel booking error:", err);
    alert("⚠️ Failed to cancel booking. It may already be cancelled or index is invalid.");
  }
}

window.connectWallet = connectWallet;
window.bookSession = bookSession;
window.addReview = addReview;
window.loadReviews = loadReviews;
window.saveUserProfile = saveUserProfile;
window.showMyBookings = showMyBookings;
