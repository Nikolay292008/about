

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


/*3D анимация для карточки на главном экране*/ 
let home = document.querySelector("#home")
let descr = document.querySelector(".descr")
home.addEventListener("mousemove", function(e) {
    let dx = e.pageX - window.innerWidth / 2
    let dy = e.pageY - window.innerHeight / 2
    let angleX = 20 * dx / (window.innerWidth / 2)
    let angleY = 20 * dy / (window.innerHeight / 2)
    descr.style.transform = `rotateX(${-angleY}deg) rotateY(${angleX}deg)`
})
