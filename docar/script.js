const copperPrice = 3500;
const tinPrice = 10500;
const goldPrice = 45000;
const ironPrice = 4000;
const scrapMetalPrice = 75000;

let totalReward = 0;

function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    const range = end - start;
    const startTime = performance.now();

    function step(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const value = Math.floor(start + range * progress);
        obj.textContent = `${value} Kč`;

        if (progress < 1) {
            requestAnimationFrame(step);
        }
    }

    requestAnimationFrame(step);
}

function calculateReward() {
    const copper = parseFloat(document.getElementById('copper').value) || 0;
    const tin = parseFloat(document.getElementById('tin').value) || 0;
    const gold = parseFloat(document.getElementById('gold').value) || 0;
    const iron = parseFloat(document.getElementById('iron').value) || 0;
    const scrapMetal = parseFloat(document.getElementById('scrapMetal').value) || 0;
    const newTotalReward = (copper * copperPrice) + (tin * tinPrice) + (gold * goldPrice) + (iron * ironPrice) + (scrapMetal * scrapMetalPrice);

    animateValue('totalReward', totalReward, newTotalReward, 500);
    totalReward = newTotalReward;

    if (totalReward === 0) {
        $('#orderButton').prop('disabled', true);
    } else {
        $('#orderButton').prop('disabled', false);
    }
}

document.getElementById('copper').addEventListener('input', calculateReward);
document.getElementById('tin').addEventListener('input', calculateReward);
document.getElementById('gold').addEventListener('input', calculateReward);
document.getElementById('iron').addEventListener('input', calculateReward);
document.getElementById('scrapMetal').addEventListener('input', calculateReward);

$('#orderModal').on('show.bs.modal', function () {
    document.getElementById('orderCopper').value = document.getElementById('copper').value;
    document.getElementById('orderTin').value = document.getElementById('tin').value;
    document.getElementById('orderGold').value = document.getElementById('gold').value;
    document.getElementById('orderIron').value = document.getElementById('iron').value;
    document.getElementById('orderScrapMetal').value = document.getElementById('scrapMetal').value;
    document.getElementById('orderTotalReward').value = totalReward;
});

document.getElementById('orderForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const data = {
        copperCount: document.getElementById('orderCopper').value,
        tinCount: document.getElementById('orderTin').value,
        goldCount: document.getElementById('orderGold').value,
        ironCount: document.getElementById('orderIron').value,
        scrapMetalCount: document.getElementById('orderScrapMetal').value,
        totalReward: totalReward,
        name: document.getElementById('name').value,
        contact: document.getElementById('contact').value,
    };

    fetch("https://www.jackal.studio/api/docar.js", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })
        .then(response => response.text())
        .then(data => {
            try {

                const jsonData = JSON.parse(data);
                console.log('Úspěch:', jsonData);
            } catch (error) {
                console.log('Odpověď není platný JSON:', data);
            }

            $('#orderModal').modal('hide');

            document.getElementById('rewardForm').reset();
            calculateReward();

            $('.toast').toast('show');
        })
        .catch((error) => {
            console.error('Error:', error);
        });
});
