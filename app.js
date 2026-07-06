const menuButton = document.querySelector(".menu-button");
const navActions = document.querySelector(".nav-actions");

if (menuButton && navActions) {
  menuButton.addEventListener("click", () => {
    const isOpen = navActions.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });
}
