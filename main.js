

document.addEventListener("DOMContentLoaded", () => {
    let animatedTitles = document.querySelectorAll(".animate.seven")

    let observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("active");
            }
        });
    }, {
        threshold: 0.8
    });
    animatedTitles.forEach(title => observer.observe(title));
});
