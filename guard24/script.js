function generateCaptcha() {
    const charsArray = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lengthOtp = 6;
    let captcha = [];
    for (let i = 0; i < lengthOtp; i++) {
        let index = Math.floor(Math.random() * charsArray.length);
        captcha.push(charsArray[index]);
    }
    return captcha.join("");
}

function drawCaptcha(captchaCode) {
    const canvas = document.getElementById('captcha');
    const context = canvas.getContext('2d');
    canvas.width = 150;
    canvas.height = 50;

    context.clearRect(0, 0, canvas.width, canvas.height);

    context.font = "30px Arial";
    context.fillStyle = "#000";
    context.fillText(captchaCode, 10, 35);
}

$(document).ready(function() {
    let captchaCode = generateCaptcha();
    drawCaptcha(captchaCode);

    $('#orderForm').submit(function(e) {
        e.preventDefault();

        const name = $('#name').val();
        const email = $('#email').val();
        const phone = $('#phone').val();
        const message = $('#message').val();
        const captchaInput = $('#captchaInput').val();

        if (captchaInput !== captchaCode) {
            alert("Nesprávně vyplněná CAPTCHA. Zkuste to prosím znovu.");
            captchaCode = generateCaptcha();
            drawCaptcha(captchaCode);
            return;
        }

        fetch("https://api.jackal.studio/api/guard24", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: name,
                email: email,
                phone: phone,
                message: message,
            }),
        })
        .then(response => {
            if (!response.ok) {
                console.error('Nepodařilo se odeslat data');
            } else {
                console.log('Data úspěšně odeslána');

                $('#orderForm')[0].reset();
                $('#orderSuccessToast').toast('show');
                captchaCode = generateCaptcha();
                drawCaptcha(captchaCode);
            }
        })
        .catch(error => {
            console.error('Nepodařilo se odeslat data', error);
        });
    });
});
