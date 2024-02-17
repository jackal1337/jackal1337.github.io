$(document).ready(function () {
    var urlParams = new URLSearchParams(window.location.search);
    var carId = urlParams.get('id');

    var cars = [{
            id: 1,
            title: "BMW M5",
            images: ["M5/M5_front.png", "M5/M5_back.png", "M5/M5_side.png", "M5/M5_detail.png"],
            details: {
                rok_vyroby: "2011",
                prevodovka: "7-stupňová automatická",
                motor: "BMW S63 twin-turbocharged V8",
                vykon: "412kW",
                palivo: "Benzín",
                polep: "Celopolep karosérie a černé doplňky",
                upravy: "Motor s turbem, Silnější brzdy, ",
                upravy2: " Zvýšený zámek otáčení +8, Úprava ECU - výkon,Závodní šestibodové pásy, Samosvorny diferenciál 1-WAY, Zatížená zadní část, Seřízení geometrie T1, Základní bezp. polo-rám (ocel)",
                maximalni_rychlost: "N/A km/h",
                vin: "18299",
                cena: "5.500.000 Kč"
            }
        },
        {
            id: 2,
            title: "Audi R8",
            images: ["R8/R8_front.png", "R8/R8_back.png", "R8/R8_side.png", "R8/R8_detail.png"],
            details: {
                rok_vyroby: "2010",
                prevodovka: "6-stupňová automatická",
                motor: "Audi R8 5.2 V10 FSI",
                vykon: "525kW",
                palivo: "Benzín",
                polep: "Celopolep karosérie",
                upravy: "Odlehčená karosérie, Žádný omezovač, Motor s turbem, ",
                upravy2: "Závodní šestibodové pásy, Seřízení geometrie T2, Úprava ECU - výkon, Základní bezp. polo-rám (ocel)",
                maximalni_rychlost: "345 km/h",
                vin: "14775",
                cena: "8.500.000 Kč"
            }
        },
        {
            id: 3,
            title: "Chevrolet Corvette C6",
            images: ["C6/C6_front.png", "C6/C6_back.png", "C6/C6_side.png", "C6/C6_detail.png"],
            details: {
                rok_vyroby: "2009",
                prevodovka: "6-stupňová manuální",
                motor: "LS3 6.2 V8",
                vykon: "316kW",
                palivo: "Benzín",
                polep: "Celopolep karosérie",
                upravy: "Zpevněná karosérie, Úprava ECU - výkon, ",
                upravy2: "Motor s turbem, Zvýšený zámek otáčení +8, Silnější brzdy, Samosvorný diferenciál 2-WAY, Seřízení geometrie T1, Závodní šestibodové pásy",
                maximalni_rychlost: "N/A km/h",
                vin: "19643",
                cena: "7.500.000 Kč"
            }
        },
        {
            id: 4,
            title: "Dodge Charger 5.7 V8",
            images: ["charger/charger_front.png", "charger/charger_back.png", "charger/charger_side.png", "charger/charger_detail.png"],
            details: {
                rok_vyroby: "2018",
                prevodovka: "8-stupňová automatická",
                motor: "5.7 V8 HEMI TorqueFlite",
                vykon: "276kW",
                palivo: "Benzín",
                polep: "Ne",
                upravy: "Odlehčená karosérie, Žádný omezovač,  ",
                upravy2: "Zvýšený zámek otáčení +8, Samosvorný diferenciál 1-WAY, Zatížená zadní část, Seřízení geometrie T2, Závodní šestibodové pásy, Vzduchový podvozek",
                maximalni_rychlost: "N/A km/h",
                vin: "6468",
                cena: "1.750.000 Kč"
            }
        },
        {
            id: 5,
            title: "Pontiac Grand Prix IV",
            images: ["pontiac/pontiac_front.png", "pontiac/pontiac_back.png", "pontiac/pontiac_side.png", "pontiac/pontiac_detail.png"],
            details: {
                rok_vyroby: "1981",
                prevodovka: "4-stupňová manuální",
                motor: "Pontiac 5.0L V8",
                vykon: "129kW",
                palivo: "Benzín",
                polep: "Celopolep karosérie",
                upravy: "N/A",
                upravy2: "",
                maximalni_rychlost: "N/A km/h",
                vin: "21469",
                cena: "7.500.000 Kč"
            }
        },
        {
            id: 6,
            title: "Ford Mustang GT 5.0",
            images: ["mustang/mustang_front.png", "mustang/mustang_back.png", "mustang/mustang_side.png", "mustang/mustang_detail.png"],
            details: {
                rok_vyroby: "2016",
                prevodovka: "6-stupňová automatická",
                motor: "5.0L Coyote V8",
                vykon: "313kW",
                palivo: "Benzín",
                polep: "Celopolep karosérie",
                upravy: "Žádný omezovač, Motor s turbem, ",
                upravy2: "Závodní šestibodové pásy, Samosvorný diferenciál 1-WAY, Úprava ECU - výkon, Seřízení geometrie T2, Silnější brzdy",
                maximalni_rychlost: "N/A km/h",
                vin: "18941",
                cena: "3.500.000 Kč"
            }
        },
    ];

    var carInfo = cars.find(function (car) {
        return car.id.toString() === carId;
    });

    $('#carTitle').text(carInfo.title);
    $.each(carInfo.images, function (index, value) {
        $('#carouselExampleControls').append(
            '<div class="item"><img class="d-block w-100" src="' + value + '" alt=""></div>'
        );
    });
    $('#rok_vyroby').text(carInfo.details.rok_vyroby);
    $('#prevodovka').text(carInfo.details.prevodovka);
    $('#motor').text(carInfo.details.motor);
    $('#vykon').text(carInfo.details.vykon);
    $('#palivo').text(carInfo.details.palivo);
    $('#polep').text(carInfo.details.polep);
    $('#upravy').text(carInfo.details.upravy);
    $('#upravy2').text(carInfo.details.upravy2);
    $('#maximalni_rychlost').text(carInfo.details.maximalni_rychlost);
    $('#vin').text(carInfo.details.vin);
    $('#cena').text(carInfo.details.cena);

    $('#toggleDetails').click(function () {
        $('.collapsed-row').slideToggle();
        $(this).find('i').toggleClass('bi-arrow-down-circle bi-arrow-up-circle');
    });

    $('.owl-carousel').owlCarousel({
        loop: true,
        margin: 10,
        items: 1,
        autoWidth: false,
        autoPlay: true,
    });
});