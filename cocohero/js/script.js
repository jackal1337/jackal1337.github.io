document.addEventListener('DOMContentLoaded', function() {
    const shapes = document.querySelectorAll('.shape');
    
    shapes.forEach(shape => {
        const randomX = Math.random() * 100;
        const randomY = Math.random() * 100;
        
        shape.style.transform = `translate(${randomX}px, ${randomY}px)`;
    });

    $('.ui-preview').owlCarousel({
        items: 1,
        loop: true,
        margin: 30,
        nav: false,
        dots: true,
        autoplay: true,
        autoplayTimeout: 4000,
        autoplayHoverPause: true,
        smartSpeed: 1000,
        animateIn: 'fadeIn',
        animateOut: 'fadeOut',
        onInitialized: function() {
            setTimeout(() => {
                $('.ui-preview .owl-item.active .item').addClass('active');
            }, 100);
        },
        onTranslated: function() {
            $('.ui-preview .item').removeClass('active');
            $('.ui-preview .owl-item.active .item').addClass('active');
        }
    });
});
