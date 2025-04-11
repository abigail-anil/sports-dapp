let signer;

async function loginWithMetaMask() {
  if (!window.ethereum) return alert("🦊 Please install MetaMask to continue!");

  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();

    const address = await signer.getAddress();

    // Save to local storage
    localStorage.setItem("walletConnected", "true");
    localStorage.setItem("userAddress", address);

    // Optional: show connected address (only if element exists)
    const addrBox = document.getElementById("walletAddress");
    if (addrBox) addrBox.innerText = `Connected: ${address}`;

    // Load contracts and token balance
    await loadABIs();
    await displayTokenBalance();

    // ✅ Redirect to the dashboard
    window.location.href = "/dashboard";

  } catch (error) {
    console.error("🔴 Wallet connection failed:", error);
    alert("Connection failed. Please try again.");
  }
}

// Auto login if already connected
window.addEventListener("load", async () => {
  if (localStorage.getItem("walletConnected") === "true") {
    await loginWithMetaMask();
  }
});

// Expose signer for dapp.js
window.getSigner = () => signer;
