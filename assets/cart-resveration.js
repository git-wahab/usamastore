const BASE_URL_Cart = "https://smartcart-staging.robustapps.net";
document.addEventListener("DOMContentLoaded", () => {
  async function fetchCartItems() {
    try {
      const response = await fetch("/cart.js", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "ngrok-skip-browser-warning": "true",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch cart data");
      }

      const cartData = await response.json();
      return cartData.items.map((item) => ({
        variantId: `gid://shopify/ProductVariant/${item.variant_id.toString()}`,
        qty: item.quantity,
        name: item.title,
        product_name: item.product_title,
      }));
    } catch (error) {
      console.error("Error fetching cart items:", error.message);
      return [];
    }
  }

  const customerIdMetaTagCart = document.querySelector(
    'meta[name="customer-id"]'
  );
  const customerIdCart = customerIdMetaTagCart.getAttribute("data-customer-id");

  async function handleReserveButtonClick(btnElem, variantData = null) {
    try {
      let lineItems = [];

      if (variantData) {
        lineItems = [
          {
            variantId: `gid://shopify/ProductVariant/${variantData.variantId}`,
            qty: parseInt(variantData.variantQuantity, 10),
            name: variantData.variantName,
            product_name: variantData.productName,
          },
        ];
      } else {
        lineItems = await fetchCartItems();
        if (lineItems.length === 0) {
          alert("No items found in the cart");
          setLoadingState(btnElem, false);
          return;
        }
      }

      const data = {
        customerId: customerIdCart,
        lineItems: lineItems,
      };

      let createOrderResponse;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        createOrderResponse = await fetch(
          `${RESERVE_PRODUCT_BASE_URL}/api/draft-orders`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "ngrok-skip-browser-warning": "true",
            },
            body: JSON.stringify(data),
          }
        );

        if (createOrderResponse.ok) {
          break;
        }

        attempts += 1;
        if (attempts < maxAttempts) {
          console.warn(`Retrying... (${attempts}/${maxAttempts})`);
        }
      }

      if (!createOrderResponse.ok) {
        throw new Error("Error reserving product");
      }

      const responseData = await createOrderResponse.json();

      if (responseData.error) {
        showToast(responseData.message, "error");
        setLoadingState(btnElem, false);
        return;
      }

      if (!responseData.error) {
        if (!variantData) {
          await clearCart();
        }
        window.location.href = "/pages/reserved-products";
      }

      setLoadingState(btnElem, false);
    } catch (error) {
      showToast("Error reserving product", "error");
      console.error("Error:", error.message);
      setLoadingState(btnElem, false);
    }
  }

  function setLoadingState(btnElem, isLoading) {
    if (isLoading) {
      btnElem.textContent = "Reserving...";
      btnElem.disabled = true;
    } else {
      btnElem.textContent = "Reserve Product";
      btnElem.disabled = false;
    }
  }

  const reserveItemButton = document.getElementById("reservation-button");
  const reserveItemButtonDrawer = document.getElementById(
    "reservation-button-drawer"
  );
  const reserveItemButtonsCart = document.querySelectorAll(
    ".reservation-button-cart"
  );
  const reserveItemButtonProduct = document.querySelector(
    ".reservation-button-product"
  );
  const reserveItemButtonsCollection = document.querySelectorAll(
    ".reservation-button-collection"
  );
  if (reserveItemButton)
    reserveItemButton.addEventListener("click", async () => {
      const isExpired = window.reservationData.isExpired;
      if (isExpired) {
        showToast(
          "You cannot reserve more products. Your timer has been expired",
          "error"
        );
        return;
      }
      setLoadingState(reserveItemButton, true);
      handleReserveButtonClick(reserveItemButton);
    });
  if (reserveItemButtonDrawer)
    reserveItemButtonDrawer.addEventListener("click", async () => {
      const isExpired = window.reservationData.isExpired;
      if (isExpired) {
        showToast(
          "You cannot reserve more products. Your timer has been expired",
          "error"
        );
        return;
      }
      setLoadingState(reserveItemButtonDrawer, true);
      handleReserveButtonClick(reserveItemButtonDrawer);
    });

  if (reserveItemButtonProduct)
    reserveItemButtonProduct.addEventListener("click", async (e) => {
      e.preventDefault();
      const isExpired = window.reservationData.isExpired;

      const variantSelect = document.querySelector('[name="id"]');
      const quantityInput = document.querySelector('[name="quantity"]');

      let variantId = reserveItemButtonProduct.getAttribute("data-variant-id");
      let variantName =
        reserveItemButtonProduct.getAttribute("data-variant-name");
      let variantQuantity =
        reserveItemButtonProduct.getAttribute("data-quantity");
      const productName =
        reserveItemButtonProduct.getAttribute("data-product-name");

      if (variantSelect && quantityInput) {
        reserveItemButtonProduct.dataset.variantId = variantSelect.value;
        reserveItemButtonProduct.dataset.quantity = quantityInput.value;

        variantId = variantSelect.value;
        variantQuantity = quantityInput.value;
      }

      const variantData = {
        variantId,
        variantName,
        variantQuantity,
        productName,
      };

      if (isExpired) {
        showToast(
          "You cannot reserve more products. Your timer has been expired",
          "error"
        );
        return;
      }

      setLoadingState(reserveItemButtonProduct, true);

      handleReserveButtonClick(reserveItemButtonProduct, variantData);
    });
  if (reserveItemButtonsCart) {
    reserveItemButtonsCart.forEach((btnElem) => {
      btnElem.addEventListener("click", (e) => {
        e.preventDefault();
        const isExpired = window.reservationData.isExpired;
        const variantId = btnElem.getAttribute("data-variant-id");
        const variantName = btnElem.getAttribute("data-variant-name");
        const variantQuantity = btnElem.getAttribute("data-quantity");
        const productName = btnElem.getAttribute("data-product-name");

        const variantData = {
          variantId,
          variantName,
          variantQuantity,
          productName,
        };

        if (isExpired) {
          showToast(
            "You cannot reserve more products. Your timer has been expired",
            "error"
          );
          return;
        }

        setLoadingState(btnElem, true);

        handleReserveButtonClick(btnElem, variantData);
      });
    });
  }

  if (reserveItemButtonsCollection) {
    reserveItemButtonsCollection.forEach((btnElem) => {
      btnElem.addEventListener("click", (e) => {
        e.preventDefault();
        const isExpired = window.reservationData.isExpired;
        const variantId = btnElem.getAttribute("data-variant-id");
        const variantName = btnElem.getAttribute("data-variant-name");
        const variantQuantity = btnElem.getAttribute("data-quantity");
        const productName = btnElem.getAttribute("data-product-name");

        const variantData = {
          variantId,
          variantName,
          variantQuantity,
          productName,
        };

        if (isExpired) {
          showToast(
            "You cannot reserve more products. Your timer has been expired",
            "error"
          );
          return;
        }

        setLoadingState(btnElem, true);

        handleReserveButtonClick(btnElem, variantData);
      });
    });
  }

  async function clearCart() {
    try {
      const clearCartResponse = await fetch("/cart/clear.js", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      if (!clearCartResponse.ok) {
        throw new Error("Failed to clear cart");
      }
    } catch (error) {
      console.error("Error clearing cart:", error.message);
      throw error;
    }
  }
});
