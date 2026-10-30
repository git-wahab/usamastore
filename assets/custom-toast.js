function createToastContainer() {
  const toastContainer = document.createElement("div");
  toastContainer.id = "custom-toast-container";
  document.body.appendChild(toastContainer);
}

function showToast(message, type = "success") {
  const toastContainer = document.getElementById("custom-toast-container");
  if (!toastContainer) {
    console.error("Toast container not found!");
    return;
  }

  const toast = document.createElement("div");
  toast.className = `custom-toast ${type}`;
  toast.innerText = message;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

window.showToast = showToast;

window.onload = function () {
  if (!document.getElementById("custom-toast-container")) {
    createToastContainer();
  }
};
