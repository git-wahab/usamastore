// CartReservation module
const CartReservation = (function () {
  // Configuration
  const CONFIG = {
    BASE_URL: "https://smartcart-staging.robustapps.net",
    DEFAULT_CURRENCY: "USD",
    API_ENDPOINTS: {
      DRAFT_ORDERS: "/api/draft-orders/",
      UPDATE_DRAFT_ORDER: "/api/update-draft-order",
    },
    HEADERS: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
  };

  // State management
  const state = {
    customerId: "",
    startTime: null,
    endTime: null,
    isExpired: false,
    currentDraftOrder: null,
    updatedOrderItems: [],
    countdownInterval: null,
    currentPath: window.location.pathname,
  };

  // DOM elements
  const DOM = {
    initSelectors: () => {
      DOM.customerIdMetaTag = document.querySelector(
        'meta[name="customer-id"]'
      );
      DOM.confirmationModalContainer = document.querySelector(
        ".confirmation-modal-container"
      );
      DOM.loadingOverlay = document.getElementById("loading-container");
      DOM.reservedQuantity = document.querySelectorAll(".reserved-quantity");
      DOM.reservedProductTimerBar = document.getElementById(
        "reserved-product-timer-bar"
      );
      DOM.reservationCheckout = document.getElementById("reservation-checkout");
      DOM.totalPriceReservedProducts = document.getElementById(
        "total-price-reserved-products"
      );
      DOM.totalDiscountReservedProducts = document.getElementById(
        "total-discount-reserved-products"
      );
      DOM.subTotalReservedProducts = document.getElementById(
        "subtotal-price-reserved-products"
      );
      DOM.totalTaxReservedProducts = document.getElementById(
        "total-tax-reserved-products"
      );
      DOM.reservedTableBody = document.getElementById("reserved-table-body");
      DOM.reservePageTitle = document.getElementById("reserve-page-title");
      DOM.reservedProductFooter = document.getElementById(
        "reserved-product-footer"
      );
      DOM.reservationButtonDrawer = document.getElementById(
        "reservation-button-drawer"
      );
      DOM.totalNumberOfProductsContainer = document.getElementById(
        "total-number-of-products"
      );
      DOM.confirmButton = document.querySelector(".confirmation-modal-accept");
      DOM.closeModalButton = document.querySelector(
        ".confirmation-modal-close"
      );
      DOM.timerCountdown = document.getElementById("timer-countdown");
      DOM.timerCountdownContainer = document.getElementById(
        "timer-countdown-container"
      );
      DOM.timeRemainingReservedProducts = document.getElementById(
        "time-remaining-reserved-products"
      );
      DOM.timerBarCheckoutLink = document.getElementById(
        "timer-bar-checkout-link"
      );
      DOM.timerBarCheckoutMessage = document.getElementById(
        "timer-bar-checkout-message"
      );
    },
  };

  // Utility functions
  const utils = {
    getCurrencySymbol: (locale, currency) => {
      return (0)
        .toLocaleString(locale, {
          style: "currency",
          currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })
        .replace(/\d/g, "")
        .trim();
    },

    formatRemainingTime: (hours) => {
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
        formattedTime += `${remainingHours} hour${
          remainingHours > 1 ? "s" : ""
        }`;
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
    },

    calculateTimeRemaining: () => {
      const now = new Date();
      return state.endTime - now;
    },

    formatTimeDisplay: (timeRemaining) => {
      const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor(
        (timeRemaining % (1000 * 60 * 60)) / (1000 * 60)
      );

      let formattedTime = "";

      if (days > 0) {
        formattedTime += days + (days === 1 ? " day" : " days");
      }

      if (hours > 0) {
        if (formattedTime !== "") {
          formattedTime += ", ";
        }
        formattedTime += hours + (hours === 1 ? " hour" : " hours");
      }

      if (minutes > 0 || formattedTime !== "") {
        if (formattedTime !== "") {
          formattedTime += " and ";
        }
        formattedTime += minutes + " mins";
      }

      return formattedTime;
    },
  };

  // API methods
  const api = {
    fetchDraftOrders: async () => {
      ui.showLoading();

      if (state.currentPath.includes("/reserved-products")) {
        DOM.reservePageTitle?.classList.add("hidden");
        DOM.reservedProductFooter.style.display = "none";
      }

      try {
        const response = await fetch(
          `${CONFIG.BASE_URL}${CONFIG.API_ENDPOINTS.DRAFT_ORDERS}${state.customerId}`,
          {
            method: "GET",
            headers: CONFIG.HEADERS,
          }
        );

        if (!response.ok) {
          throw new Error("Failed to get draft order");
        }

        const responseData = await response.json();
        state.currentDraftOrder = responseData;

        if (responseData.error) {
          ui.handleErrorResponse(responseData);
          return;
        }

        if (responseData.error_message == "Draft order not found.") {
          ui.handleDraftOrderNotFound(responseData);
          return;
        }

        ui.processSuccessfulResponse(responseData);
        return responseData;
      } catch (error) {
        ui.handleFetchError(error);
      } finally {
        ui.hideLoading();
      }
    },

    updateDraftOrder: async (index) => {
      const loadingIndicator = document.querySelector(
        `#CartItem-${index} .loading-while-updating`
      );
      loadingIndicator.classList.remove("hidden");

      const data = {
        customerId: state.customerId,
        lineItems: state.updatedOrderItems.map((item) => ({
          uuid: item?.id?.toString(),
          variantId: item?.node.variant.id?.toString(),
          qty: item.node.quantity,
          product_name: item.node.title,
          name: item.node.variant.title,
          applied_discount: item.node.appliedDiscount,
        })),
      };

      try {
        const response = await fetch(
          `${CONFIG.BASE_URL}${CONFIG.API_ENDPOINTS.UPDATE_DRAFT_ORDER}`,
          {
            method: "POST",
            headers: CONFIG.HEADERS,
            body: JSON.stringify(data),
          }
        );

        if (!response.ok) {
          showToast("Failed to update Reserved product", "error");
          throw new Error("Failed to update reserved product");
        }

        api.fetchDraftOrders();
        const result = await response.json();

        if (result.error) {
          showToast(result.message, "error");
          return;
        }

        showToast("Reserved product updated successfully", "success");
        return result;
      } catch (error) {
        console.error("Error updating draft order:", error);
        showToast("Error updating reserved product", "error");
      } finally {
        loadingIndicator.classList.add("hidden");
      }
    },

    updateDraftOrderForCheckout: async (lineItems) => {
      try {
        const data = {
          customerId: state.customerId,
          lineItems: lineItems.map((item) => ({
            uuid: item.node.id.toString(),
            variantId: item.node.variant.id,
            qty: Math.min(
              item.node.quantity,
              item.node.variant.inventoryQuantity
            ),
            product_name: item.node.title,
            name: item.node.variant.title,
            applied_discount: item.node.appliedDiscount,
          })),
        };

        const response = await fetch(
          `${CONFIG.BASE_URL}${CONFIG.API_ENDPOINTS.UPDATE_DRAFT_ORDER}`,
          {
            method: "POST",
            headers: CONFIG.HEADERS,
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
    },
  };

  // UI handlers
  const ui = {
    showLoading: () => {
      if (
        state.currentPath.includes("/reserved-products") &&
        DOM.loadingOverlay
      ) {
        DOM.loadingOverlay.classList.remove("hidden");
        DOM.reservedTableBody.style.display = "none";
      }
    },

    hideLoading: () => {
      if (
        state.currentPath.includes("/reserved-products") &&
        DOM.loadingOverlay
      ) {
        DOM.loadingOverlay.classList.add("hidden");
        DOM.reservedTableBody.style.display = "block";
      }
    },

    disableButtonsAndInputs: () => {
      const removeButtons = document.querySelectorAll(".cart-item__remove");
      const quantityButtons = document.querySelectorAll(".quantity__button");
      const quantityInputs = document.querySelectorAll(".quantity__input");

      removeButtons.forEach((button) => {
        button.disabled = true;
      });
      quantityButtons.forEach((button) => {
        button.disabled = true;
      });
      quantityInputs.forEach((input) => {
        input.disabled = true;
      });
    },

    enableButtonsAndInputs: () => {
      const removeButtons = document.querySelectorAll(".cart-item__remove");
      const quantityButtons = document.querySelectorAll(".quantity__button");
      const quantityInputs = document.querySelectorAll(".quantity__input");

      removeButtons.forEach((button) => {
        button.disabled = false;
        button.style.opacity = "0.5";
      });
      quantityButtons.forEach((button) => {
        button.disabled = false;
      });
      quantityInputs.forEach((input) => {
        input.disabled = false;
      });
    },

    updateCountdown: () => {
      const timeRemaining = utils.calculateTimeRemaining();
      const timerExpiredMessage =
        "Your reserve timer has ended. Your items are no longer guaranteed.you cannot reserve more products your timer have been expire";

      if (state.endTime && timeRemaining <= 0) {
        if (DOM.timerCountdownContainer) {
          DOM.timerCountdownContainer.innerText = timerExpiredMessage;
        }

        if (DOM.timerBarCheckoutMessage) {
          DOM.timerBarCheckoutMessage.innerHTML = timerExpiredMessage;
        }

        clearInterval(state.countdownInterval);
        return;
      }

      const formattedTime = utils.formatTimeDisplay(timeRemaining);

      if (DOM.timerCountdown) {
        DOM.timerCountdown.innerText = formattedTime;
      }

      if (DOM.timeRemainingReservedProducts && state.endTime) {
        DOM.timeRemainingReservedProducts.innerText = formattedTime;
      }
    },

    populateCartItems: (lineItems, shopCurrency = CONFIG.DEFAULT_CURRENCY) => {
      const cartItemsContainer = document.querySelector(
        ".cart__items .js-contents .cart-items"
      );

      if (!cartItemsContainer) return;

      cartItemsContainer.innerHTML = "";

      // Handle empty cart
      if (lineItems.length === 0) {
        const emptyCartHtml = `
          <tr class="cart-item" id="CartItem">
            <div class="cart__warnings" style="display: block !important">
              <h1 class="cart__empty-text" style="display: block !important">No products in reserve</h1>
              <a href="/collections/all" class="button">Continue shopping</a>
            </div>
          </tr>
        `;
        cartItemsContainer.insertAdjacentHTML("beforebegin", emptyCartHtml);
        return;
      }

      // Add table header
      cartItemsContainer.insertAdjacentHTML(
        "beforeend",
        ui.getTableHeaderHtml()
      );

      // Add each item
      lineItems.forEach((item, index) => {
        const itemHtml = ui.generateCartItemHtml(item, index, shopCurrency);
        cartItemsContainer.insertAdjacentHTML("beforeend", itemHtml);
      });

      events.attachEventListeners();
    },

    getTableHeaderHtml: () => {
      return `
        <thead id="table-header-reservation">
          <tr>
            <th class="caption-with-letter-spacing" colspan="2" scope="col">Product</th>
            <th class="medium-hide large-up-hide right caption-with-letter-spacing" colspan="1" scope="col">Total</th>
            <th class="cart-items__heading--wide small-hide caption-with-letter-spacing" colspan="1" scope="col">Quantity</th>
            <th class="small-hide right caption-with-letter-spacing" colspan="1" scope="col">Total</th>
          </tr>
        </thead>
      `;
    },

    generateCartItemHtml: (item, index, shopCurrency) => {
      return `
        <tr class="cart-item" id="CartItem-${index + 1}">
          <td class="cart-item__media" style="cursor: pointer;">
            <a href="/products/${
              item.node.product.handle
            }" style="text-decoration: none;">
              <div class="cart-item__image-container gradient global-media-settings">
                <img src="${
                  item.node.image.url
                }" class="cart-item__image" alt="${
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
                  item.node.applied_discount
                    ? "text-decoration: line-through"
                    : ""
                }">${utils.getCurrencySymbol("en-US", `${shopCurrency}`)}${
        item.node.variant.price
      }</dd>
              </div>
            </dl>
          </td>
          <td class="cart-item__totals right medium-hide large-up-hide">
            <div class="cart-item__price-wrapper">
              <dl class="cart-item__discounted-prices">
                <dt class="visually-hidden">Sale Price</dt>
                <dd class="price price--end">${utils.getCurrencySymbol(
                  "en-US",
                  `${shopCurrency}`
                )}${item.node.variant.price}</dd>
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
      }" ${item?.node.variant.id ? "" : "disabled='true'"}>
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
              <cart-remove-button id="Remove-${index + 1}" data-index="${
        index + 1
      }">
                <button class="cart-item__remove reserved-products-remove" data-variant-id="${
                  item.node.variant.id
                }" id="Remove-${index + 1}" data-index="${
        index + 1
      }" type="button">
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
            <div class="loading-overlay loading-while-updating hidden">
              <div class="loading-overlay__spinner">
                <svg aria-hidden="true" focusable="false" role="presentation" class="spinner" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg">
                  <circle class="path" fill="none" stroke-width="6" cx="33" cy="33" r="30"></circle>
                </svg>
              </div>
            </div>
            <div class="cart-item__price-wrapper">
              <dl class="cart-item__discounted-prices">
                <dt class="visually-hidden">Sale Price</dt>
                <dd class="price price--end" style="${
                  item.node.appliedDiscount
                    ? "text-decoration: line-through; opacity: 0.5"
                    : ""
                }">
                  ${utils.getCurrencySymbol(
                    "en-US",
                    `${shopCurrency}`
                  )}${Number(
        item.node?.originalTotalSet?.shopMoney?.amount
      ).toFixed(2)}
                </dd>
                ${
                  item.node.appliedDiscount
                    ? `
                  <dd class="price price--end">
                    ${utils.getCurrencySymbol(
                      "en-US",
                      `${shopCurrency}`
                    )}${Number(
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
    },

    handleErrorResponse: (responseData) => {
      if (state.currentPath.includes("/reserved-products")) {
        showToast(
          responseData?.error_message || responseData?.message,
          "error"
        );
        ui.populateCartItems([]);
        DOM.reservedQuantity.forEach((el) => el.classList.add("hidden"));
      }
      DOM.reservedProductTimerBar.style.display = "none";
    },

    handleDraftOrderNotFound: (responseData) => {
      const formattedTime = utils.formatRemainingTime(
        Number(responseData?.data?.levelHours)
      );

      if (formattedTime && DOM.reservationButtonDrawer) {
        DOM.reservationButtonDrawer.textContent = `Reserve my cart for ${formattedTime}`;
      }

      if (state.currentPath.includes("/reserved-products")) {
        ui.populateCartItems([]);
        DOM.reservePageTitle?.classList.add("hidden");
        DOM.reservedProductFooter.style.display = "none";
      }

      DOM.reservedQuantity.forEach((el) => el.classList.add("hidden"));
      DOM.reservedProductTimerBar.style.display = "none";
    },

    processSuccessfulResponse: (responseData) => {
      state.startTime = new Date(responseData.data?.created_at);
      state.endTime = new Date(
        responseData.data?.draftOrder?.reserveInventoryUntil
      );
      state.isExpired = state.endTime <= new Date();

      window.reservationData = {
        endTime: state.endTime,
        startTime: state.startTime,
        isExpired: state.isExpired,
      };

      const numberOfProducts =
        responseData.data?.draftOrder?.lineItems?.edges.length || 0;
      const checkoutUrl = responseData.data?.draftOrder?.invoiceUrl;

      // Update UI based on response
      if (state.currentPath.includes("/reserved-products")) {
        ui.updateReservedProductsPage(responseData, checkoutUrl);
      }

      ui.updateQuantityDisplay(numberOfProducts);
      ui.updateTimerBar(checkoutUrl, numberOfProducts);

      if (state.currentPath.includes("/reserved-products")) {
        DOM.reservePageTitle?.classList.remove("hidden");
        DOM.reservedProductFooter.style.display = "block";
      }

      // Store the initial line items
      state.updatedOrderItems =
        responseData.data?.draftOrder?.lineItems?.edges || [];
    },

    updateReservedProductsPage: (responseData, checkoutUrl) => {
      const shopCurrency =
        responseData.data?.draftOrder?.totalPriceSet?.shopMoney?.currencyCode ||
        CONFIG.DEFAULT_CURRENCY;

      ui.populateCartItems(
        responseData.data?.draftOrder?.lineItems?.edges || [],
        shopCurrency
      );

      if (DOM.reservationCheckout) {
        DOM.reservationCheckout.href = checkoutUrl;
      }

      const discountAmount =
        responseData.data?.draftOrder?.appliedDiscount?.amount;
      const currencySymbol = utils.getCurrencySymbol("en-US", shopCurrency);

      // Update price displays
      if (DOM.subTotalReservedProducts) {
        DOM.subTotalReservedProducts.textContent =
          currencySymbol +
          responseData.data?.draftOrder?.subtotalPriceSet?.shopMoney?.amount;
      }

      if (DOM.totalPriceReservedProducts) {
        DOM.totalPriceReservedProducts.textContent =
          currencySymbol +
          responseData.data?.draftOrder?.totalPriceSet?.shopMoney?.amount;
      }

      if (DOM.totalTaxReservedProducts) {
        DOM.totalTaxReservedProducts.textContent =
          currencySymbol + responseData.data?.draftOrder?.totalTax;
      }

      if (DOM.totalDiscountReservedProducts) {
        DOM.totalDiscountReservedProducts.textContent =
          "-" + currencySymbol + (discountAmount ?? "0.00");
      }

      // Show/hide timer
      if (DOM.timerCountdownContainer) {
        DOM.timerCountdownContainer.style.display = state.endTime
          ? "block"
          : "none";
      }

      ui.updateCountdown();
    },

    updateQuantityDisplay: (numberOfProducts) => {
      if (DOM.reservedQuantity) {
        DOM.reservedQuantity.forEach((element) => {
          element.classList.remove("hidden");
          element.textContent = numberOfProducts;
        });
      }
    },

    updateTimerBar: (checkoutUrl, numberOfProducts) => {
      if (!DOM.reservedProductTimerBar) return;

      if (state.endTime) {
        if (DOM.timerBarCheckoutLink) {
          DOM.timerBarCheckoutLink.href = checkoutUrl;
        }

        DOM.reservedProductTimerBar.style.display = "block";

        if (DOM.totalNumberOfProductsContainer && !state.isExpired) {
          DOM.totalNumberOfProductsContainer.textContent = `You have ${numberOfProducts} reserved ${
            numberOfProducts > 1 ? "products" : "product"
          }.`;
        }
      } else {
        DOM.reservedProductTimerBar.style.display = "none";
      }
    },

    handleFetchError: (error) => {
      if (state.currentPath.includes("/reserved-products")) {
        console.error("Error fetching draft orders:", error);
        showToast(error.message, "error");
        DOM.reservePageTitle?.classList.add("hidden");
        DOM.reservedProductFooter.style.display = "none";
      }

      DOM.reservedQuantity.forEach((el) => el.classList.add("hidden"));
    },
  };

  // Event handlers
  const events = {
    attachEventListeners: () => {
      const removeButtons = document.querySelectorAll(".cart-item__remove");
      removeButtons.forEach((button) => {
        button.removeEventListener("click", events.handleRemoveItem);
        button.addEventListener("click", events.handleRemoveItem);
      });

      const quantityInputs = document.querySelectorAll(".quantity__input");
      quantityInputs.forEach((input) => {
        input.removeEventListener("change", events.handleInputChange);
        input.addEventListener("change", events.handleInputChange);
      });
    },

    setupInitialEventListeners: () => {
      // Reservation checkout button
      if (DOM.reservationCheckout) {
        DOM.reservationCheckout.addEventListener(
          "click",
          events.handleReservationCheckout
        );
      }

      // Confirmation modal buttons
      if (DOM.confirmButton) {
        DOM.confirmButton.addEventListener("click", events.confirmRemoveItem);
      }

      if (DOM.closeModalButton) {
        DOM.closeModalButton.addEventListener(
          "click",
          events.closeConfirmationModal
        );
      }
    },

    handleRemoveItem: async (event) => {
      const button = event.target.closest("button");
      if (!button) return;

      const index = button.dataset.index;
      if (DOM.confirmButton) {
        DOM.confirmButton.dataset.index = index;
      }

      if (DOM.confirmationModalContainer) {
        DOM.confirmationModalContainer.classList.remove("modal-hidden");
      }
    },

    confirmRemoveItem: async (event) => {
      if (!DOM.confirmButton) return;

      DOM.confirmButton.innerHTML = "Deleting...";
      const index = event.target.dataset.index;
      const input = document.querySelector(`#Quantity-${index}`);

      if (!input) return;

      const variantId = input.dataset.variantId;
      const item = state.updatedOrderItems.find(
        (item) => item.node.variant.id === parseInt(variantId)
      );
      const appliedDiscount = item ? item.node.appliedDiscount : null;

      events.updateLineItem(variantId, 0, appliedDiscount);
      ui.disableButtonsAndInputs();
      await api.updateDraftOrder(index);
      DOM.confirmButton.innerHTML = "Confirm";
      ui.enableButtonsAndInputs();

      const cartItem = document.querySelector(`#CartItem-${index}`);
      if (cartItem) {
        cartItem.remove();
      }

      if (DOM.confirmationModalContainer) {
        DOM.confirmationModalContainer.classList.add("modal-hidden");
      }
    },

    closeConfirmationModal: () => {
      if (DOM.confirmationModalContainer) {
        DOM.confirmationModalContainer.classList.add("modal-hidden");
      }
    },

    handleInputChange: async (event) => {
      const input = event.target;
      const index = input.dataset.index;
      const newValue = parseInt(input.value);
      const variantId = input.dataset.variantId;

      // Get the applied discount from the line item
      const item = state.updatedOrderItems.find(
        (item) => item.node.variant.id === parseInt(variantId)
      );
      const appliedDiscount = item ? item.node.appliedDiscount : null;

      events.updateLineItem(variantId, newValue, appliedDiscount);
      ui.disableButtonsAndInputs();
      await api.updateDraftOrder(index);
      ui.enableButtonsAndInputs();
    },

    updateLineItem: (variantId, newQuantity, appliedDiscount = null) => {
      const itemIndex = state.updatedOrderItems.findIndex(
        (item) => item.node.variant.id === parseInt(variantId)
      );

      if (itemIndex !== -1) {
        if (newQuantity === 0) {
          state.updatedOrderItems.splice(itemIndex, 1);
        } else {
          state.updatedOrderItems[itemIndex].node.quantity = newQuantity;
          state.updatedOrderItems[itemIndex].node.appliedDiscount =
            appliedDiscount;
        }
      } else if (newQuantity > 0) {
        state.updatedOrderItems.push({
          node: {
            variant: { id: parseInt(variantId) },
            quantity: newQuantity,
            appliedDiscount: appliedDiscount,
          },
        });
      }
    },

    handleReservationCheckout: async (event) => {
      event.preventDefault();
      const button = event.target;
      const originalText = button.textContent;

      try {
        button.disabled = true;
        button.textContent = "Checking inventory...";

        if (
          !state.currentDraftOrder ||
          !state.currentDraftOrder.data?.draftOrder
        ) {
          throw new Error("No draft order found.");
        }

        const lineItems =
          state.currentDraftOrder.data.draftOrder.lineItems?.edges;
        if (!lineItems || !lineItems.length) {
          throw new Error("No items in cart.");
        }

        // Check if any items are out of stock
        const outOfStockItems = lineItems.filter(
          (item) => item.node.variant.inventoryQuantity < 1
        );

        if (outOfStockItems.length > 0) {
          await events.handleOutOfStockItems(lineItems, outOfStockItems);
        }

        window.location.href =
          state.currentDraftOrder.data.draftOrder.invoiceUrl;
      } catch (error) {
        console.error("Error during checkout:", error);
        showToast("An error occurred while processing your checkout.", "error");
      } finally {
        button.disabled = false;
        button.textContent = originalText;
      }
    },

    handleOutOfStockItems: async (lineItems, outOfStockItems) => {
      // If all items are out of stock
      if (outOfStockItems.length === lineItems.length) {
        showToast(
          "All items are out of stock. Your cart will be reset.",
          "error"
        );
        await handleResetCart(); // This function needs to be defined or imported
        return;
      }

      // Filter out out-of-stock items and update quantities if needed
      const updatedLineItems = lineItems
        .filter((item) => item.node.variant.inventoryQuantity > 0)
        .map((item) => ({
          ...item,
          node: {
            ...item.node,
            quantity: Math.min(
              item.node.quantity,
              item.node.variant.inventoryQuantity
            ),
          },
        }));

      const updatedDraftOrder = await api.updateDraftOrderForCheckout(
        updatedLineItems
      );
      if (!updatedDraftOrder) {
        throw new Error("Failed to update draft order.");
      }

      showToast(
        "Some items were removed due to being out of stock.",
        "warning"
      );
    },
  };

  // Initialize the module
  const init = () => {
    // Initialize DOM selectors
    DOM.initSelectors();

    // Set customer ID from meta tag
    state.customerId =
      DOM.customerIdMetaTag?.getAttribute("data-customer-id") || "";

    // Set up event listeners
    events.setupInitialEventListeners();

    // Start countdown timer
    state.countdownInterval = setInterval(ui.updateCountdown, 1000);

    // Fetch data
    api.fetchDraftOrders();
  };

  // Public methods
  return {
    init: init,
    fetchDraftOrders: api.fetchDraftOrders,
    updateCountdown: ui.updateCountdown,
  };
})();

// Initialize on DOM content loaded
document.addEventListener("DOMContentLoaded", CartReservation.init);
