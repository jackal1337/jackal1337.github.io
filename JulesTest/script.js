document.addEventListener('DOMContentLoaded', function () {
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Basic form validation for the contact form
    const contactForm = document.querySelector('#contact form'); // Assuming the form is directly under #contact

    if (contactForm) {
        contactForm.addEventListener('submit', function (e) {
            let errors = [];
            const nameField = contactForm.querySelector('input[name="name"]'); // Assuming input has name="name"
            const emailField = contactForm.querySelector('input[name="email"]'); // Assuming input has name="email"
            const messageField = contactForm.querySelector('textarea[name="message"]'); // Assuming textarea has name="message"

            // Validate Name
            if (!nameField || nameField.value.trim() === '') {
                errors.push('Name is required.');
                // Optionally, display error near nameField
            }

            // Validate Email
            if (!emailField || emailField.value.trim() === '') {
                errors.push('Email is required.');
            } else if (!isValidEmail(emailField.value.trim())) {
                errors.push('Please enter a valid email address.');
            }
            
            // Validate Message
            if (!messageField || messageField.value.trim() === '') {
                errors.push('Message is required.');
            }

            if (errors.length > 0) {
                e.preventDefault(); // Prevent form submission
                alert(errors.join('\n')); // Display errors
            }
        });
    }

    function isValidEmail(email) {
        // Basic email validation regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
});
