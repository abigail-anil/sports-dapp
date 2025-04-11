let signer = null;

// Safe global signer init
if (typeof window !== "undefined" && window.ethereum && localStorage.getItem("walletConnected") === "true") {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  signer = provider.getSigner();
  window.getSigner = () => signer;
}



let bookingContract, reviewContract, nftContract, tokenContract;

const bookingContractAddress = "0x10af4e802604f37d0cad94af167bf32af8cb18be";
const reviewContractAddress = "0x8b0979591caf02f4efbce863179f8a8bbc3a70b2";
const nftContractAddress = "0x7a15dd4aa740472494ef080fe401852f5382dae2";
const tokenContractAddress = "0xe1dbc7e05ea5c5ba271bbdc87535a60474db953c";

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
  displayTokenBalance();
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
  if (!signer || !tokenContract || !bookingContract) {
    return alert("Connect wallet first.");
  }

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
    msg.innerText = "⏳ Checking approval...";

    const amountInWei = ethers.utils.parseUnits(tokenAmount.toString(), 18);
    const userAddress = await signer.getAddress();
    const currentAllowance = await tokenContract.allowance(userAddress, bookingContractAddress);

    if (currentAllowance.lt(amountInWei)) {
      msg.innerText = "⏳ Approving token once...";
      const approveTx = await tokenContract.approve(bookingContractAddress, ethers.constants.MaxUint256);
      await approveTx.wait();
    }

    msg.innerText = "⏳ Confirming booking...";

    const tx = await bookingContract.bookWithTokenSession(sport, centerName, amountInWei);
    const receipt = await tx.wait();

    msg.innerText = receipt.status === 1
      ? "✅ Booking successful with token!"
      : "❌ Booking reverted!";
  } catch (err) {
    console.error("Token booking error:", err);
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

async function showMyNFTs() {
  if (!signer || !nftContract) return alert("Connect wallet first.");

  const address = await signer.getAddress();
  const list = document.getElementById("nftList");
  list.innerHTML = "";

  try {
    const tokenIds = await nftContract.tokensOfOwner(address);

    if (tokenIds.length === 0) {
      list.innerHTML = "<p class='text-muted'>You don’t own any NFTs yet.</p>";
      return new bootstrap.Modal(document.getElementById("nftModal")).show();
    }

    for (let i = 0; i < tokenIds.length; i++) {
      const tokenId = tokenIds[i];
      const uri = await nftContract.tokenURI(tokenId);
      const badge = await nftContract.badgeDetails(tokenId);

      let imageUrl = "";
      try {
        const res = await fetch(uri);
        const metadata = await res.json();
        imageUrl = metadata.image.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/");
      } catch (err) {
        console.error("❌ Error fetching metadata", err);
        imageUrl = "";
      }

      const card = document.createElement("div");
      card.className = "col-md-6";
      card.innerHTML = `
        <div class="card h-100 shadow-sm">
          <img src="${imageUrl}" class="card-img-top" onerror="this.style.display='none'">
          <div class="card-body">
            <h5 class="card-title">🏅 ${BadgeTypeToLabel(badge.badgeType)}</h5>
            <p class="card-text">${badge.description}</p>
            <p class="text-muted">Token ID: ${tokenId}</p>
          </div>
        </div>`;
      list.appendChild(card);
    }

    new bootstrap.Modal(document.getElementById("nftModal")).show();
  } catch (err) {
    console.error("NFT load error:", err);
    alert("Failed to load your NFTs.");
  }
}

function BadgeTypeToLabel(badgeType) {
  switch (parseInt(badgeType)) {
    case 0: return "Session Completion";
    case 1: return "Membership Pass";
    case 2: return "Collectible";
    default: return "Unknown";
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  if (localStorage.getItem("walletConnected") === "true" && window.getSigner) {
    signer = window.getSigner();
    await loadABIs();
    await displayTokenBalance();
  }
});


window.showMyNFTs = showMyNFTs;
window.bookSession = bookSession;
window.addReview = addReview;
window.loadReviews = loadReviews;
window.saveUserProfile = saveUserProfile;
window.showMyBookings = showMyBookings;
