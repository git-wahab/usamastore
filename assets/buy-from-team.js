const APP_URL = "https://bft.robustapps.net";

function getRandomStores(stores, count) {
  const shuffled = stores.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

const button = document.getElementById("buy-from-team-button");
const teamMemberStoresContainer = document.getElementById(
  "team-member-stores-container"
);
const teamMemberStoresContent = document.getElementById(
  "team-member-stores-content"
);

button.addEventListener("click", sendProductSkuToApi);

function sendProductSkuToApi() {
  if (document.getElementById("msg-box")) {
    document.getElementById("msg-box").remove();
  }
  const sku = button.getAttribute("data-sku");
  // Add loading state to the button
  button.disabled = true;
  button.innerHTML = "<span>Loading...</span>";

  const apiUrl = APP_URL + "/store/search";
  const selectedStores = getRandomStores(team_members, 5);

  fetch(`${apiUrl}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sku: sku,
      storeNames: selectedStores,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      displayProductLinks(data);
    })
    .catch((error) => {
      console.error("Error:", error);
    })
    .finally(() => {
      // Reset the button after request is complete
      button.disabled = false;
      button.innerHTML = "<span> Buy from a team member </span>";
    });
}

function displayProductLinks(data) {
  const container = document.getElementById("product-links");
  container.innerHTML = "";

  let hasAvailableProduct = false;

  data.forEach((item) => {
    if (item.productAvailable) {
      hasAvailableProduct = true;
      if (hasAvailableProduct) {
        teamMemberStoresContainer.style.display = "block";
        teamMemberStoresContent.style.display = "block";
      }
      const storeName = item.store.alias;
      item.products.forEach((product) => {
        const productLink = document.createElement("div");
        productLink.style.backgroundColor = "transparent";
        productLink.style.padding = "10px";
        productLink.style.marginBottom = "10px";

        const link = document.createElement("a");
        link.href = product.url;
        link.textContent = `${storeName}`;
        link.style.textTransform = "capitalize";
        link.style.display = "block";
        link.style.color = "#0066cc";
        link.style.textDecoration = "underline";
        link.style.textUnderlineOffset = "2px";
        link.style.width = "max-content";
        link.target = "_blank";

        productLink.appendChild(link);
        container.appendChild(productLink);
      });
    }
  });

  if (!hasAvailableProduct) {
    teamMemberStoresContainer.style.display = "block";
    teamMemberStoresContent.style.display = "none";
    const message = document.createElement("div");
    message.id = "msg-box";
    message.style.backgroundColor = "#f8d7da";
    message.style.color = "#721c24";
    message.style.padding = "10px 16px";
    message.style.border = "1px solid #f5c6cb";
    message.style.borderRadius = "4px";
    message.style.marginBottom = "16px";
    message.textContent =
      "Unfortunately, this product is currently unavailable from any of our team members.";
    container.appendChild(message);
  }
}
