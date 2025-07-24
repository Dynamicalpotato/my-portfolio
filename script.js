// 1) Wait until DOM is loaded
document.addEventListener("DOMContentLoaded", () => {

    // 2) Dark mode toggle
  // Dark mode via swipe switch
const switchCheckbox = document.getElementById("theme-switch-checkbox");
switchCheckbox.addEventListener("change", () => {
  const nextTheme = switchCheckbox.checked ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", nextTheme);
});

  
    // 3) Scroll‐in animations using IntersectionObserver
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
  
    document.querySelectorAll(".fade-in").forEach(el => {
      observer.observe(el);
    });
  
    // 4) Optional click feedback on your name
    document.querySelector(".hero h1").addEventListener("click", () => {
      alert("Thank you for visiting 🌿");
    });
  
  });
  
