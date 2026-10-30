const BASE_URL = "https://smartcart-staging.robustapps.net";

document.addEventListener("DOMContentLoaded", () => {
  const customerIdMetaTag = document.querySelector('meta[name="customer-id"]');
  if (!customerIdMetaTag) return;

  const customerId = customerIdMetaTag.getAttribute("data-customer-id");
  const loadingOverlay = document.getElementById("loading-container");
  const waitListTableBody = document.getElementById("wait-list-table-body");
  const confirmationModalContainer = document.querySelector(
    ".confirmation-modal-container"
  );

  const showLoading = () => {
    loadingOverlay && loadingOverlay.classList.remove("hidden");
    waitListTableBody.style.display = "none";
  };

  const hideLoading = () => {
    loadingOverlay && loadingOverlay.classList.add("hidden");
    waitListTableBody.style.display = "";
  };

  const getCurrencySymbol = (locale, currency) =>
    (0)
      .toLocaleString(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
      .replace(/\d/g, "")
      .trim();

  const fetchWaitListItems = async () => {
    showLoading();

    try {
      const response = await fetch(`${BASE_URL}/api/waitlists/${customerId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch wait list items");
      }

      const data = await response.json();

      if (data.error) {
        console.error("Error fetching wait list items:", data.message);
        hideLoading();
        return;
      }
      console.log(data.data.length, "wait list data"); // Handle the response data structure as per your API
      if (data && data.data && data.data.length > 0) {
        populateWaitListItems(data.data, "SAR");
      } else {
        const thElements = document.querySelectorAll(".cart-items thead th");
        thElements.forEach((th) => {
          th.style.setProperty("display", "none", "important");
        });

        // Fallback when no wait list items are found
        waitListTableBody.innerHTML = `
       
           
              <div class="empty-wait-list">
                <h1>Your waitlist is empty</h1>
             
               
              </div>
           
        
        `;
      }
    } catch (error) {
      console.error("Error:", error.message);
      waitListTableBody.innerHTML = `
        <tr>
          <td colspan="3" class="cart__warnings">
            <div class="empty-wait-list">
              <h3>Error loading wait list items</h3>
              <p>Please try again later or contact customer support.</p>
              <div class="empty-wait-list__button-wrapper">
                <a href="/collections/all" class="button">Continue shopping</a>
              </div>
            </div>
          </td>
        </tr>
      `;
    } finally {
      hideLoading();
    }
  };
  const populateWaitListItems = (waitListItems, shopCurrency = "SAR") => {
    console.log(waitListItems, "waitListItems");
    if (!waitListTableBody) return; // Check if the table body element exists

    // Clear any existing content first
    waitListTableBody.innerHTML = "";

    if (waitListItems.length === 0) {
      waitListTableBody.innerHTML = `
        <tr>
          <td colspan="2" class="cart__warnings">
            <div class="empty-wait-list">
              <h3>Your waitlist is empty</h3>
              <p>You haven't added any products to your waitlist yet.</p>
              <div class="empty-wait-list__button-wrapper">
                <a href="/collections/all" class="button">Continue shopping</a>
              </div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    const currencySymbol = getCurrencySymbol("en-US", shopCurrency);
    waitListTableBody.innerHTML = waitListItems
      .map((item, index) => {
        const waitlist_id = item.waitlist_id;
        const productTitle = item.product?.title || "Unknown Product";
        const imageSrc =
          item.product?.featuredImage?.url ||
          '{{ "product-1" | placeholder_svg_tag }}'; // Get product handle from product object
        const productHandle = item.product?.handle || "";
        const createdAt = new Date(item.created_at).toLocaleDateString();
        const quantity = 1; // Default quantity

        return `<tr class="cart-item" id="WaitListItem-${index}">
            <td class="cart-item__combined">
              <div class="cart-item__flex-container">
                <div class="cart-item__media-wrapper">
                  <a href="/products/${productHandle}">
                    <div class="cart-item__image-container gradient global-media-settings">
                      <img
                        src="${imageSrc}"
                        class="cart-item__image"
                        alt="${productTitle}"
                        loading="lazy"
                        width="150"
                        height="150"
                      >
                    </div>
                  </a>
                </div>
                <div class="cart-item__details-wrapper">
                  <a href="/products/${productHandle}" class="cart-item__name h4 break">${productTitle}</a>
                  <div class="product-option">
                    <strong>Added on:</strong> ${createdAt}
                  </div>
                </div>
              </div>
            </td>
            <td class="cart-item__quantity">
              <div class="cart-item__quantity-wrapper">
                <span class="quantity-value">${quantity}</span>
              </div>
            </td>
            <td class="cart-item__totals right small-hide hidden">
              <!-- Empty cell for layout balance -->
            </td>
          </tr>
        `;
      })
      .join("");
    attachEventListeners();
  };

  // Since we removed the delete functionality, this is now a simpler function
  const attachEventListeners = () => {
    // No remove buttons to attach event listeners to
  };

  // Initialize
  if (customerId) {
    fetchWaitListItems();
  }
});
