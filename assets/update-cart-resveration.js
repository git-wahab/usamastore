// let BASE_URL = "https://smartcart-staging.robustapps.net";
let BASE_URL = "https://smartcart-staging.robustapps.net";

window.reservationData = window.reservationData || {};

let startTime = "";
let endTime = "";
let isExpired;
const customerIdMetaTag = document.querySelector('meta[name="customer-id"]');
const confirmationModalContainer = document.querySelector(
  ".confirmation-modal-container"
);
const customerId = customerIdMetaTag.getAttribute("data-customer-id");
const loadingOverlay = document.getElementById("loading-container");
const reservedQuantity = document.querySelectorAll(".reserved-quantity");
const reservedProductTimerBar = document.getElementById(
  "reserved-product-timer-bar"
);

const currentPath = window.location.pathname;
const reservationCheckout = document.getElementById("reservation-checkout");
const totalPriceReservedProducts = document.getElementById(
  "total-price-reserved-products"
);
const totalDiscountReservedProducts = document.getElementById(
  "total-discount-reserved-products"
);
const subTotalReservedProducts = document.getElementById(
  "subtotal-price-reserved-products"
);
const totalTaxReservedProducts = document.getElementById(
  "total-tax-reserved-products"
);
const reservedTableBody = document.getElementById("reserved-table-body");
const reservePageTitle = document.getElementById("reserve-page-title");
// const reservedQuantityIcon = document.getElementById("reserved-quantity-icon");
const reservedProductFooter = document.getElementById(
  "reserved-product-footer"
);
const reservationButtonDrawer = document.getElementById(
  "reservation-button-drawer"
);
const totalNumberOfProductsContainer = document.getElementById(
  "total-number-of-products"
);

let updatedOrderItems = [];

const showLoading = () => {
  if (currentPath.includes("/reserved-products")) {
    loadingOverlay && loadingOverlay.classList.remove("hidden");
    reservedTableBody.style.display = "none";
  } else {
    return;
  }
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

const hideLoading = () => {
  if (currentPath.includes("/reserved-products")) {
    loadingOverlay && loadingOverlay.classList.add("hidden");
    reservedTableBody.style.display = "block";
  } else {
    return;
  }
};

const disableButtonsAndInputs = () => {
  const removeButtons = document.querySelectorAll(".cart-item__remove");
  removeButtons.forEach((button) => {
    button.disabled = true;
  });

  const quantitButtons = document.querySelectorAll(".quantity__button");
  quantitButtons.forEach((button) => {
    button.disabled = true;
  });

  const quantityInputs = document.querySelectorAll(".quantity__input");
  quantityInputs.forEach((input) => {
    input.disabled = true;
  });
};

const enableButtonsAndInputs = () => {
  const removeButtons = document.querySelectorAll(".cart-item__remove");
  removeButtons.forEach((button) => {
    button.disabled = false;
    button.style.opacity = "0.5";
  });

  const quantitButtons = document.querySelectorAll(".quantity__button");
  quantitButtons.forEach((button) => {
    button.disabled = false;
  });

  const quantityInputs = document.querySelectorAll(".quantity__input");
  quantityInputs.forEach((input) => {
    input.disabled = false;
  });
};

function formatRemainingTime(hours) {
  if (hours == null || isNaN(hours) || !hours) {
    return null;
  }

  const days = Math.floor(hours / 24);

  if (days >= 1) {
    return `${days} day${days > 1 ? "s" : ""}`;
  }

  const remainingHours = Math.floor(hours);
  const minutes = Math.floor((hours % 1) * 60);

  let formattedTime = "";

  if (remainingHours > 0) {
    formattedTime += `${remainingHours} hour${remainingHours > 1 ? "s" : ""}`;
    if (minutes > 0) {
      formattedTime += ` and `;
    }
  }

  if (minutes > 0) {
    formattedTime += `${minutes} minute${minutes > 1 ? "s" : ""}`;
  }

  if (!formattedTime) {
    formattedTime = "0 minutes";
  }

  return formattedTime;
}
let currentDraftOrder = null;

const fetchDraftOrders = async () => {
  showLoading();
  if (currentPath.includes("/reserved-products")) {
    reservePageTitle.classList.add("hidden");
    reservedProductFooter.style.display = "none";
  }
  try {
    const response = await fetch(`${BASE_URL}/api/draft-orders/${customerId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to get draft order");
    }

    const responseData = await response.json();
    console.log("🚀 ~ fetchDraftOrders ~ responseData 123:", responseData);
    currentDraftOrder = responseData;
    if (responseData.error) {
      if (currentPath.includes("/reserved-products")) {
        showToast(
          responseData?.error_message || responseData?.message,
          "error"
        );
        populateCartItems([]);
        reservedQuantity.forEach((element) => {
          element.classList.add("hidden");
        });
      }
      reservedProductTimerBar.style.display = "none";
      return;
    }
    if (responseData.error_message == "Draft order not found.") {
      const formattedTime = formatRemainingTime(
        Number(responseData?.data?.levelHours)
      );
      if (formattedTime) {
        if (reservationButtonDrawer) {
          reservationButtonDrawer.textContent = `Reserve my cart for ${formattedTime}`;
        }
      }
      if (currentPath.includes("/reserved-products")) {
        populateCartItems([]);
        reservePageTitle.classList.add("hidden");
        reservedProductFooter.style.display = "none";
      }
      reservedQuantity.forEach((element) => {
        element.classList.add("hidden");
      });
      reservedProductTimerBar.style.display = "none";
      return;
    }

    startTime = new Date(responseData.data?.created_at);
    endTime = new Date(responseData.data?.draftOrder?.reserveInventoryUntil);
    isExpired = endTime <= new Date();

    window.reservationData.endTime = endTime;
    window.reservationData.startTime = startTime;
    window.reservationData.isExpired = isExpired;

    const numberOfProducts =
      responseData.data?.draftOrder?.lineItems?.edges.length;
    const checkoutUrl = responseData.data?.draftOrder?.invoiceUrl;

    if (currentPath.includes("/reserved-products")) {
      const shopCurrency =
        responseData.data?.draftOrder?.totalPriceSet?.shopMoney?.currencyCode ||
        "USD";
      populateCartItems(
        responseData.data?.draftOrder?.lineItems?.edges || [],
        shopCurrency
      );
      reservationCheckout.href = checkoutUrl;
      const discountAmount =
        responseData.data?.draftOrder?.appliedDiscount?.amount;

      subTotalReservedProducts.textContent =
        getCurrencySymbol("en-US", shopCurrency) +
        responseData.data?.draftOrder?.subtotalPriceSet?.shopMoney?.amount;
      totalPriceReservedProducts.textContent =
        getCurrencySymbol("en-US", shopCurrency) +
        responseData.data?.draftOrder?.totalPriceSet?.shopMoney?.amount;
      totalTaxReservedProducts.textContent =
        getCurrencySymbol("en-US", shopCurrency) +
        responseData.data?.draftOrder?.totalTax;
      totalDiscountReservedProducts.textContent =
        "-" +
        getCurrencySymbol("en-US", shopCurrency) +
        (discountAmount ?? "0.00");

      if (endTime) {
        document.getElementById("timer-countdown-container").style.display =
          "block";
      } else {
        document.getElementById("timer-countdown-container").style.display =
          "none";
      }

      updateCountdown();
    }
    if (reservedQuantity) {
      reservedQuantity.forEach((element) => {
        element.classList.remove("hidden");
        element.textContent = numberOfProducts;
      });
      // reservedQuantity.classList.remove("hidden");
      // reservedQuantity.textContent =
      //   responseData.data?.draftOrder?.line_items.length;
    }
    if (reservedProductTimerBar) {
      if (endTime) {
        document.getElementById("timer-bar-checkout-link").href = checkoutUrl;
        reservedProductTimerBar.style.display = "block";
        if (totalNumberOfProductsContainer && !isExpired) {
          totalNumberOfProductsContainer.textContent = `You have ${numberOfProducts} reserved ${
            numberOfProducts > 1 ? "products" : "product"
          }.`;
        }
      } else {
        reservedProductTimerBar.style.display = "none";
      }
    }
    if (currentPath.includes("/reserved-products")) {
      reservePageTitle.classList.remove("hidden");
      reservedProductFooter.style.display = "block";
    }

    // Store the initial line items
    updatedOrderItems = responseData.data?.draftOrder?.lineItems?.edges || [];

    return responseData;
  } catch (error) {
    if (currentPath.includes("/reserved-products")) {
      console.log("🚀 ~ fetchDraftOrders ~ error:", error);
      showToast(error, "error");
      reservePageTitle.classList.add("hidden");
      reservedProductFooter.style.display = "none";
    }
    reservedQuantity.forEach((element) => {
      element.classList.add("hidden");
    });
  } finally {
    hideLoading();
  }
};

function attachEventListeners() {
  const removeButtons = document.querySelectorAll(".cart-item__remove");
  removeButtons.forEach((button) => {
    button.removeEventListener("click", handleRemoveItem);
    button.addEventListener("click", handleRemoveItem);
  });

  const quantityInputs = document.querySelectorAll(".quantity__input");
  quantityInputs.forEach((input) => {
    input.removeEventListener("change", handleInputChange);
    input.addEventListener("change", handleInputChange);
  });
}

async function handleRemoveItem(event) {
  const button = event.target.closest("button");
  const index = button.dataset.index;

  const confirmButton = document.querySelector(".confirmation-modal-accept");
  confirmButton.dataset.index = index;

  const confirmationModalContainer = document.querySelector(
    ".confirmation-modal-container"
  );
  confirmationModalContainer.classList.remove("modal-hidden");
}

async function confirmRemoveItem(event) {
  document.querySelector(".confirmation-modal-accept").innerHTML =
    "Deleting...";
  const index = event.target.dataset.index;
  const input = document.querySelector(`#Quantity-${index}`);
  const variantId = input.dataset.variantId;

  const item = updatedOrderItems.find(
    (item) => item.node.variant.id === parseInt(variantId)
  );
  const appliedDiscount = item ? item.applied_discount : null;

  updateLineItem(variantId, 0, appliedDiscount);
  disableButtonsAndInputs();
  await updateDraftOrder(index);
  document.querySelector(".confirmation-modal-accept").innerHTML = "Confirm";
  enableButtonsAndInputs();
  document.querySelector(`#CartItem-${index}`).remove();

  const confirmationModalContainer = document.querySelector(
    ".confirmation-modal-container"
  );
  confirmationModalContainer.classList.add("modal-hidden");
}

// Attach event listener to the confirm button
const confirmButton = document.querySelector(".confirmation-modal-accept");
if (confirmButton) {
  confirmButton.addEventListener("click", confirmRemoveItem);
}

function closeConfirmationModal() {
  const confirmationModalContainer = document.querySelector(
    ".confirmation-modal-container"
  );
  confirmationModalContainer.classList.add("modal-hidden");
}

const closeModalButton = document.querySelector(".confirmation-modal-close");
if (closeModalButton) {
  closeModalButton.addEventListener("click", closeConfirmationModal);
}

async function handleInputChange(event) {
  const input = event.target;
  const index = input.dataset.index;
  const newValue = parseInt(input.value);
  const variantId = input.dataset.variantId;

  // Get the applied discount from the line item
  const item = updatedOrderItems.find(
    (item) => item.node.variant.id === parseInt(variantId)
  );
  const appliedDiscount = item ? item.node.appliedDiscount : null;

  updateLineItem(variantId, newValue, appliedDiscount);
  disableButtonsAndInputs();
  await updateDraftOrder(index);
  enableButtonsAndInputs();
}

function updateLineItem(variantId, newQuantity, appliedDiscount = null) {
  const itemIndex = updatedOrderItems.findIndex(
    (item) => item.node.variant.id === variantId
  );

  if (itemIndex !== -1) {
    if (newQuantity === 0) {
      updatedOrderItems[itemIndex].node.quantity = 0;
    } else {
      updatedOrderItems[itemIndex].node.quantity = newQuantity;
      updatedOrderItems[itemIndex].node.appliedDiscount = appliedDiscount;
    }
  } else if (newQuantity > 0) {
    updatedOrderItems.push({
      node: {
        variant: { id: variantId },
        quantity: newQuantity,
        appliedDiscount: appliedDiscount,
      },
    });
  }
}

async function updateDraftOrder(index) {
  const loadingIndicator = document.querySelector(
    `#CartItem-${index} .loading-while-updating`
  );

  loadingIndicator.classList.remove("hidden");

  console.log(updatedOrderItems, "updatedOrderItems");

  const data = {
    customerId: customerId,
    lineItems: updatedOrderItems.map((item) => ({
      uuid: item?.id?.toString(),
      variantId: item?.node.variant.id?.toString(),
      qty: item.node.quantity,
      product_name: item.node.title,
      name: item.node.variant.title,
      applied_discount: item.node.appliedDiscount,
    })),
  };

  try {
    const updateResponse = await fetch(
      `${RESERVE_PRODUCT_BASE_URL}/api/update-draft-order`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify(data),
      }
    );

    const result = await updateResponse.json();

    if (result.error) {
      if (result.lowStock) {
        showToast(result.message, "warning");

        if (result.lineItem) {
          const itemIndex = updatedOrderItems.findIndex(
            (item) =>
              item.node.variant.id.toString() === result.lineItem.variantId
          );

          if (itemIndex !== -1) {
            if (result.lineItem.qty === 0) {
              updatedOrderItems.splice(itemIndex, 1);
            } else {
              updatedOrderItems[itemIndex].node.quantity = result.lineItem.qty;
            }
            fetchDraftOrders();
          }
        }

        loadingIndicator.classList.add("hidden");
        return result;
      } else {
        showToast(
          result.message || "Failed to update Reserved product",
          "error"
        );
        loadingIndicator.classList.add("hidden");
        return;
      }
    }

    if (!updateResponse.ok) {
      showToast("Failed to update Reserved product", "error");
      throw new Error("Failed to update reserved product");
    }

    fetchDraftOrders();
    showToast("Reserved product updated successfully", "success");
    return result;
  } catch (error) {
    console.error("Error updating draft order:", error);
    showToast("Error updating reserved product", "error");
  } finally {
    loadingIndicator.classList.add("hidden");
  }
}

const populateCartItems = (lineItems, shopCurrency = "USD") => {
  const cartItemsContainer = document.querySelector(
    ".cart__items .js-contents .cart-items"
  );
  // const cartItemsContainer = document.querySelector(
  //   ".cart__items .js-contents tbody"
  // );

  cartItemsContainer.innerHTML = "";
  // Check if lineItems array is empty
  if (lineItems.length === 0) {
    const itemHtml = `
       <tr class="cart-item" id="CartItem">
         <div class="cart__warnings" style="display: block !important">
    <h1 class="cart__empty-text" style="display: block !important">No products in reserve</h1>
    <a href="/collections/all" class="button">
      Continue shopping
    </a></div>
        </tr>
      `;
    cartItemsContainer.insertAdjacentHTML("beforebegin", itemHtml);
  } else {
    const tableHeaderHtml = `
    <thead id="table-header-reservation">
      <tr>
        <th class="caption-with-letter-spacing" colspan="2" scope="col">Product</th>
        <th class="medium-hide large-up-hide right caption-with-letter-spacing" colspan="1" scope="col">Total</th>
        <th class="cart-items__heading--wide small-hide caption-with-letter-spacing" colspan="1" scope="col">Quantity</th>
        <th class="small-hide right caption-with-letter-spacing" colspan="1" scope="col">Total</th>
      </tr>
    </thead>
  `;
    cartItemsContainer.insertAdjacentHTML("beforeend", tableHeaderHtml);
    lineItems.forEach((item, index) => {
      const itemHtml = `
      <tr class="cart-item" id="CartItem-${index + 1}">
  <td class="cart-item__media" style="cursor: pointer;">
  <a href="/products/${
    item.node.product.handle
  }" style="text-decoration: none;">
  <div class="cart-item__image-container gradient global-media-settings">
  <img src="${item.node?.image?.url}" class="cart-item__image" alt="${
        item.node.name
      }" loading="lazy" width="150" height="200">
  </div>
  </a>
  </td>
  <td class="cart-item__details">
  <a href="/products/${
    item.node.product.handle
  }" style="text-decoration: none; cursor: pointer;">
    <div class="cart-item__name h4 break">${item.node.name}</div>
    </a>
    <dl>
      <div class="product-option">
        <dd style="${
          item.node.applied_discount ? "text-decoration: line-through" : ""
        }>${getCurrencySymbol("en-US", `${shopCurrency}`)}${
        item.node.variant.price
      }</dd>
      </div>
    </dl>
  </td>
  <td class="cart-item__totals right medium-hide large-up-hide">
        <div class="cart-item__price-wrapper">
  <dl class="cart-item__discounted-prices">
    <dt class="visually-hidden">Sale Price</dt>
    <dd class="price price--end" 
        >
      ${getCurrencySymbol("en-US", `${shopCurrency}`)}${item.node.variant.price}
    </dd>
   
  </dl>
</div>
  </td>
  <td class="cart-item__quantity">
    <div class="cart-item__quantity-wrapper">
      <label class="visually-hidden" for="Quantity-${
        index + 1
      }">Quantity</label>
      <quantity-input class="quantity">
        <button ${
          item?.node.variant.id ? "" : 'style="display:none!important"'
        } class="quantity__button no-js-hidden" name="minus" type="button" data-index="${
        index + 1
      }" data-action="decrease" data-variant-id="${item.node.variant.id}">
          <span class="visually-hidden">Decrease Quantity</span>
          <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" role="presentation" class="icon icon-minus" fill="none" viewBox="0 0 10 2">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M.5 1C.5.7.7.5 1 .5h8a.5.5 0 110 1H1A.5.5 0 01.5 1z" fill="currentColor"></path>
          </svg>
        </button>
        <input class="quantity__input" type="number" name="updates[]" value="${
          item.node.quantity
        }" min="0" aria-label="Quantityy" id="Quantity-${
        index + 1
      }" data-index="${index + 1}" onchange="" data-variant-id="${
        item.node.variant.id
      }" ${item?.node.variant.id ? "" : "disabled='true'"}">
        <button ${
          item?.node.variant.id ? "" : 'style="display:none!important"'
        } class="quantity__button no-js-hidden" name="plus" type="button" data-index="${
        index + 1
      }" data-action="increase" data-variant-id="${item.node.variant.id}">
          <span class="visually-hidden">Increase Quantity</span>
          <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" role="presentation" class="icon icon-plus" fill="none" viewBox="0 0 10 10">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M1 4.51a.5.5 0 000 1h3.5l.01 3.5a.5.5 0 001-.01V5.5l3.5-.01a.5.5 0 00-.01-1H5.5L5.49.99a.5.5 0 00-1 .01v3.5l-3.5.01H1z" fill="currentColor"></path>
          </svg>
        </button>
      </quantity-input>
      <cart-remove-button id="Remove-${index + 1}" data-index="${index + 1}">
        <button class="cart-item__remove reserved-products-remove" data-variant-id="${
          item.node.variant.id
        }" id="Remove-${index + 1}" data-index="${index + 1}" type="button">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" aria-hidden="true" focusable="false" role="presentation" class="icon icon-remove">
            <path d="M14 3h-3.53a3.07 3.07 0 00-.6-1.65C9.44.82 8.8.5 8 .5s-1.44.32-1.87.85A3.06 3.06 0 005.53 3H2a.5.5 0 000 1h1.25v10c0 .28.22.5.5.5h8.5a.5.5 0 00.5-.5V4H14a.5.5 0 000-1zM6.91 1.98c.23-.29.58-.48 1.09-.48s.85.19 1.09.48c.2.24.3.6.36 1.02h-2.9c.05-.42.17-.78.36-1.02zm4.84 11.52h-7.5V4h7.5v9.5z" fill="currentColor"></path>
            <path d="M6.55 5.25a.5.5 0 00-.5.5v6a.5.5 0 001 0v-6a.5.5 0 00-.5-.5zM9.45 5.25a.5.5 0 00-.5.5v6a.5.5 0 001 0v-6a.5.5 0 00-.5-.5z" fill="currentColor"></path>
          </svg>
        </button>
      </cart-remove-button>
    </div>
    <div class="cart-item__error" id="Line-item-error-${
      index + 1
    }" role="alert">
      <small class="cart-item__error-text"></small>
      <svg aria-hidden="true" focusable="false" role="presentation" class="icon icon-error" viewBox="0 0 13 13">
        <circle cx="6.5" cy="6.50049" r="5.5" stroke="currentColor" fill="none"></circle>
        <path d="M6.5 3v4" stroke="currentColor" fill="none"></path>
        <circle cx="6.5" cy="8.5" r=".5" stroke="none" fill="currentColor"></circle>
      </svg>
    </div>
  </td>
  <td class="cart-item__totals right small-hide">
    <div class="loading-overlay loading-while-updating hidden" >
                      <div class="loading-overlay__spinner">
                        <svg aria-hidden="true" focusable="false" role="presentation" class="spinner" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg">
                          <circle class="path" fill="none" stroke-width="6" cx="33" cy="33" r="30"></circle>
                        </svg>
                      </div>
                    </div>
    <div class="cart-item__price-wrapper">
  <dl class="cart-item__discounted-prices">
    <dt class="visually-hidden">Sale Price</dt>
<dd class="price price--end" 
style="${
        item.node.appliedDiscount
          ? "text-decoration: line-through; opacity: 0.5"
          : ""
      }">
${getCurrencySymbol("en-US", `${shopCurrency}`)}${Number(
        item.node?.originalTotalSet?.shopMoney?.amount
      ).toFixed(2)}
</dd>
    ${
      item.node.appliedDiscount
        ? `
       <dd class="price price--end">
          ${getCurrencySymbol("en-US", `${shopCurrency}`)}${Number(
            item.node?.originalTotalSet?.shopMoney?.amount
          ).toFixed(2)}
        </dd>`
        : ""
    }
  </dl>
</div>

  </td>
</tr>
      `;

      cartItemsContainer.insertAdjacentHTML("beforeend", itemHtml);
    });
    attachEventListeners();
  }
};

document.addEventListener("DOMContentLoaded", fetchDraftOrders);

function updateCountdown() {
  const now = new Date();

  const timeRemaining = endTime - now;

  const timerBarMessage = document.getElementById("timer-bar-checkout-message");

  if (endTime && timeRemaining <= 0) {
    if (document.getElementById("timer-countdown-container")) {
      document.getElementById("timer-countdown-container").innerText =
        "Your reserve timer has ended. Your items are no longer guaranteed.";
    }

    if (timerBarMessage) {
      timerBarMessage.innerHTML =
        "Your reserve timer has ended. Your items are no longer guaranteed.";
    }
    clearInterval(countdownInterval);
    return;
  }

  let remainingTime = "";

  const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    remainingTime += days + (days === 1 ? " day" : " days");
  }

  if (hours > 0) {
    if (remainingTime !== "") {
      remainingTime += ", ";
    }
    remainingTime += hours + (hours === 1 ? " hour" : " hours");
  }

  if (minutes > 0 || remainingTime !== "") {
    if (remainingTime !== "") {
      remainingTime += " and ";
    }
    remainingTime += minutes + " mins";
  }

  if (document.getElementById("timer-countdown")) {
    document.getElementById("timer-countdown").innerText = remainingTime;
  }

  if (document.getElementById("time-remaining-reserved-products") && endTime) {
    document.getElementById("time-remaining-reserved-products").innerText =
      remainingTime;
  }
}

const countdownInterval = setInterval(updateCountdown, 1000);

async function updateDraftOrderForCheckout(lineItems) {
  try {
    const data = {
      customerId: customerId,
      lineItems: lineItems.map((item) => ({
        uuid: item.node.id.toString(),
        variantId: item.node.variant.id,
        qty: Math.min(item.node.quantity, item.node.variant.inventoryQuantity),
        product_name: item.node.title,
        name: item.node.variant.title,
        applied_discount: item.node.appliedDiscount,
      })),
    };

    const response = await fetch(
      `${RESERVE_PRODUCT_BASE_URL}/api/update-draft-order`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to update draft order.");
    }

    const result = await response.json();
    if (result.error) {
      throw new Error(result.message || "Failed to update draft order");
    }

    return result;
  } catch (error) {
    console.error("Error updating draft order:", error);
    return null;
  }
}

async function handleResetCart() {
  const button = resetCartBtn;
  const originalText = button.textContent;
  try {
    button.disabled = true;
    button.textContent = "Loading...";

    const updatedDraftOrder = await updateDraftOrderForCheckout([]);
    if (!updatedDraftOrder) {
      throw new Error("Failed to reset cart.");
    }

    hideExpiredTimerModal();
    window.location.href = "/collections/all";
  } catch (error) {
    console.error("Error resetting cart:", error);
    showToast("An error occurred while resetting your cart.", "error");
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

// Add this function near your other checkout-related functions
async function handleReservationCheckout(event) {
  event.preventDefault();
  const button = event.target;
  const originalText = button.textContent;

  try {
    button.disabled = true;
    button.textContent = "Checking inventory...";
    console.log(currentDraftOrder, "currentDraftOrder");

    if (!currentDraftOrder || !currentDraftOrder.data?.draftOrder) {
      throw new Error("No draft order found.");
    }

    const lineItems = currentDraftOrder.data.draftOrder.lineItems?.edges;

    // Check if any items are out of stock
    const outOfStockItems = lineItems.filter((item) => {
      const inventoryQty = getInventoryQuantity(item);
      return inventoryQty < 1;
    });

    if (outOfStockItems.length > 0) {
      // If all items are out of stock
      if (outOfStockItems.length === lineItems.length) {
        showToast(
          "All items are out of stock. Your cart will be reset.",
          "error"
        );
        await handleResetCart();
        return;
      }

      const updatedLineItems = lineItems
        .filter((item) => getInventoryQuantity(item) < 1)
        .map((item) => ({
          ...item,
          node: {
            ...item.node,
            quantity: Math.max(
              0,
              Math.min(
                item.node.quantity,
                Math.max(0, item.node.variant.inventoryQuantity)
              )
            ),
          },
        }));

      const updatedDraftOrder = await updateDraftOrderForCheckout(
        updatedLineItems
      );
      if (!updatedDraftOrder) {
        throw new Error("Failed to update draft order.");
      }

      showToast(
        "Some items were removed due to being out of stock.",
        "warning"
      );
    }
    window.location.href = currentDraftOrder.data.draftOrder.invoiceUrl;
  } catch (error) {
    console.error("Error during checkout:", error);
    showToast("An error occurred while processing your checkout.", "error");
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

function getInventoryQuantity(item) {
  try {
    if (
      item?.node?.variant?.inventoryItem?.inventoryLevels?.nodes?.[0]
        ?.quantities
    ) {
      const quantities =
        item.node.variant.inventoryItem.inventoryLevels.nodes[0].quantities;

      const onHandQuantity = quantities.find((q) => q.name === "on_hand");
      if (onHandQuantity !== undefined) {
        return onHandQuantity.quantity;
      }
    }
    return 0;
  } catch (error) {
    console.error("Error getting inventory quantity:", error);
    return 0;
  }
}

//event listener for the reservation checkout button
if (reservationCheckout) {
  reservationCheckout.addEventListener("click", handleReservationCheckout);
}
