export function generateCartItemHtml(item, index) {
  return `
        <tr class="cart-item" id="CartItem-${index + 1}">
          <td class="cart-item__media">
            <a href="/product-url" class="cart-item__link" aria-hidden="true" tabindex="-1"></a>
            <div class="cart-item__image-container gradient global-media-settings">
              <img src="${
                item.product_image
              }" class="cart-item__image" alt="Product Image" loading="lazy" width="150" height="200">
            </div>
          </td>
          <td class="cart-item__details">
            <p class="caption-with-letter-spacing">${item.vendor}</p>
            <a href="/product-url" class="cart-item__name h4 break">${
              item.name
            }</a>
            <dl>
              <div class="product-option">
                <dt>Price: </dt>
                <dd>${item.price}</dd>
              </div>
            </dl>
          </td>
          <td class="cart-item__totals right medium-hide large-up-hide">
            <div class="cart-item__price-wrapper">
              <dl class="cart-item__discounted-prices">
                <dt class="visually-hidden">Regular Price</dt>
                <dd>
                  <s class="cart-item__old-price price price--end">${
                    item.original_price
                  }</s>
                </dd>
                <dt class="visually-hidden">Sale Price</dt>
                <dd class="price price--end">${item.price}</dd>
              </dl>
              <div class="unit-price caption">${item.quantity}</div>
            </div>
          </td>
          <td class="cart-item__quantity">
            <div class="cart-item__quantity-wrapper">
              <label class="visually-hidden" for="Quantity-${
                index + 1
              }">Quantity</label>
              <quantity-input class="quantity">
                <button class="quantity__button no-js-hidden" name="minus" type="button" data-index="${
                  index + 1
                }" data-action="decrease" data-variant-id="${item.variant_id}">
                  <span class="visually-hidden">Decrease Quantity</span>
                  <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" role="presentation" class="icon icon-minus" fill="none" viewBox="0 0 10 2">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M.5 1C.5.7.7.5 1 .5h8a.5.5 0 110 1H1A.5.5 0 01.5 1z" fill="currentColor"></path>
                  </svg>
                </button>
                <input class="quantity__input" type="number" name="updates[]" value="${
                  item.quantity
                }" min="0" aria-label="Quantity" id="Quantity-${
    index + 1
  }" data-index="${index + 1}" onchange="" data-variant-id="${item.variant_id}">
                <button class="quantity__button no-js-hidden" name="plus" type="button" data-index="${
                  index + 1
                }" data-action="increase" data-variant-id="${item.variant_id}">
                  <span class="visually-hidden">Increase Quantity</span>
                  <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" role="presentation" class="icon icon-plus" fill="none" viewBox="0 0 10 10">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M1 4.51a.5.5 0 000 1h3.5l.01 3.5a.5.5 0 001-.01V5.5l3.5-.01a.5.5 0 00-.01-1H5.5L5.49.99a.5.5 0 00-1 .01v3.5l-3.5.01H1z" fill="currentColor"></path>
                  </svg>
                </button>
              </quantity-input>
              <cart-remove-button id="Remove-${index + 1}" data-index="${
    index + 1
  }">
                <button class="cart-item__remove" data-variant-id="${
                  item.variant_id
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
            <div class="loading-overlay hidden">
              <div class="loading-overlay__spinner">
                <svg aria-hidden="true" focusable="false" role="presentation" class="spinner" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg">
                  <circle class="path" fill="none" stroke-width="6" cx="33" cy="33" r="30"></circle>
                </svg>
              </div>
            </div>
            <div class="cart-item__price-wrapper">
              <dl class="cart-item__discounted-prices">
                <dt class="visually-hidden">Price</dt>
                <dd class="price price--end">${item.price}</dd>
              </dl>
              <div class="unit-price caption">${item.quantity} Units</div>
            </div>
          </td>
        </tr>
      `;
}
