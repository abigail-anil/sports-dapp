let signer, nftContract, tokenContract;

const nftAddress = "0x7A15DD4aA740472494Ef080fE401852F5382Dae2";
const tokenAddress = "0xe1dbc7e05ea5c5ba271bbdc87535a60474db953c";
const PRO_BADGE_URI = "bafkreicbejjbml3jswq4x7lb6t5xydajb36qddrfxe64ifnpy4pmdhkcay"; // Unique CID

console.log("✅ nft_shop.js loaded");

window.addEventListener("DOMContentLoaded", async () => { 
  if (typeof window.ethereum !== "undefined" && localStorage.getItem("walletConnected") === "true") {
    await connectWallet(false); 
  }

  await fetchNFTImages(); 
});

async function connectWallet(showAlert = true) {
  if (!window.ethereum) {
    if (showAlert) alert("🦊 Please install MetaMask to continue.");
    return;
  }

  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);

    let accounts = await provider.listAccounts();
    if (accounts.length === 0 && showAlert) {
      accounts = await provider.send("eth_requestAccounts", []);
    }
    if (accounts.length === 0) return;

    signer = provider.getSigner();
    const address = await signer.getAddress();
    const shortAddr = address.slice(0, 6) + "..." + address.slice(-4);
    const walletEl = document.getElementById("walletAddress");
    if (walletEl) walletEl.innerText = "Connected: " + shortAddr;
    localStorage.setItem("walletConnected", "true");

    const [nftABI, tokenABI] = await Promise.all([
      fetch("/abi/nft_abi.json").then(res => res.json()),
      fetch("/abi/token_abi.json").then(res => res.json()),
    ]);

    nftContract = new ethers.Contract(nftAddress, nftABI, signer);
    tokenContract = new ethers.Contract(tokenAddress, tokenABI, signer);
  } catch (err) {
    console.error("❌ Wallet connection failed:", err);
    if (showAlert) alert("⚠️ Failed to connect wallet.");
  }
}

async function fetchNFTImages() {
  const imgElements = document.querySelectorAll("img[data-uri]");
  for (const imgEl of imgElements) {
    const uri = imgEl.getAttribute("data-uri");
    try {
      const res = await fetch(uri);
      const metadata = await res.json();
      const imageUrl = metadata.image.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/");
      imgEl.src = imageUrl;
    } catch (e) {
      console.error("❌ Failed to load NFT metadata:", uri, e);
      imgEl.alt = "❌ Failed to load image";
    }
  }
}

async function hasClaimedFreeNFT() {
  const user = await signer.getAddress();
  const tokenIds = await nftContract.tokensOfOwner(user);

  for (let i = 0; i < tokenIds.length; i++) {
    const uri = await nftContract.tokenURI(tokenIds[i]);
    if (uri.includes(PRO_BADGE_URI)) return true;
  }
  return false;
}

async function claimFreeNFT(uri, description) {
  try {
    const alreadyClaimed = await hasClaimedFreeNFT();
    if (alreadyClaimed) return alert("⚠️ You have already claimed the free Pro Badge.");

    const address = await signer.getAddress();
    const tx = await nftContract.mintCollectible(address, uri, description);
    await tx.wait();
    alert("✅ NFT claimed!");
  } catch (err) {
    console.error("❌ Claim error:", err);
    alert("❌ Failed to claim NFT.");
  }
}

async function buyWithETH(uri, description) {
  try {
    const tx = await nftContract.mintCollectible(await signer.getAddress(), uri, description);
    await tx.wait();
    alert("✅ Purchased with ETH!");
  } catch (err) {
    console.error("❌ ETH purchase failed:", err);
    alert("❌ ETH purchase failed.");
  }
}

async function buyWithSPT(uri, amount, description) {
  try {
    const address = await signer.getAddress();
    const amountWei = ethers.utils.parseUnits(amount.toString(), 18);

    const approveTx = await tokenContract.approve(nftAddress, amountWei);
    await approveTx.wait();

    const tx = await nftContract.mintCollectible(address, uri, description);
    await tx.wait();
    alert("✅ Purchased with SPT!");
  } catch (err) {
    console.error("❌ SPT purchase failed:", err);
    alert("❌ SPT purchase failed.");
  }
}

// Make available globally for onclick=""
window.connectWallet = connectWallet;
window.claimFreeNFT = claimFreeNFT;
window.buyWithETH = buyWithETH;
window.buyWithSPT = buyWithSPT;
