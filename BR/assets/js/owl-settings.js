document.addEventListener("DOMContentLoaded", function () {
    var owl = $('.owl-carousel');
    
    owl.owlCarousel({
        center: true,
        items: 2,
        loop: true,
        margin: 20,
        autoplay: true, // Automatické přehrávání
        autoplayTimeout: 5000, // Interval v ms
        autoplayHoverPause: true, // Pauza při najetí myší
        animateOut: 'fadeOut', // Animace při změně snímků
        responsive: {
            0: {
                items: 1
            },
            600: {
                items: 2
            },
            1000: {
                items: 3
            }
        }
    });
});
