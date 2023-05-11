
(function () {

    'use strict';

    // get page elements
    const modal = document.querySelector("#modal");
    const button = document.querySelector("#button");
    const h1 = document.querySelector("h1");
    const modalFooter = document.getElementById("modal-footer");

    // Update date
    setDate();

    function setDate() {
        const date = new Date();
        const year = date.getFullYear();
        const month = date.toLocaleString('default', { month: 'long' });
        modalFooter.textContent = ` Phillip Ashford | ${month}, ${year}`;
    }

    // display modal when button is clicked
    button.addEventListener("click", function () {
        modal.style.display = "block";
    });

    // close modal when user clicks anywhere on the page
    modal.addEventListener("click", function () {
        modal.style.display = "none";
    });

    // Set button UI
    buttonUI();

    function buttonUI() {
        button.style.top = h1.offsetHeight + 20 + "px";
    }

    // Add event listener for window resize
    // When page rotates or is resized, reset page UI
    window.addEventListener("resize", buttonUI);

    ////////////////////////////////////////
    ////////// MAP INSTANTIATION ///////////
    ////////////////////////////////////////

    // map options
    const options = {
        center: [52, -122],
        zoom: 3.75,
        scrollWheelZoom: true,
        zoomSnap: 0.1,
        dragging: true,
        zoomControl: false
    };

    // create the Leaflet map
    const map = L.map("map", options);

    // Add a new zoom control to the bottom right
    L.control.zoom({
        position: 'bottomright',
    }).addTo(map);

    // Create a pane for the GeoJSON layer
    map.createPane('geojsonPane');
    map.getPane('geojsonPane').style.zIndex = 400;

    // Create a pane for the labels layer
    map.createPane('labelsPane');
    map.getPane('labelsPane').style.zIndex = 500;

    // Originally I was wanting to create a small pane of Hawaii to lay over the main map becuase Hawaii's data is so different that it's worth having its own callout. Unfortunately I wasn't able to successfully accomplish this. Perhaps you can see where I went wrong with my code.The relevant code is immediately below as well as line 116 and 307, and in css/styles.css lines 213-220 and index.html line 23. 
    
    //I decided on a makeshift solution that you can check out on lines 499-522.

    // map.createPane('hawaiiPane');
    // map.getPane('hawaiiPane').style.zIndex = 350;

    // var hawaiiMap = L.map('hawaiiMap', {
    //     center: [20.5050, -157.3231], // Center coordinates for Hawaii
    //     zoom: 6,
    //     minZoom: 6,
    //     maxZoom: 12,
    //     attributionControl: false,
    //     zoomControl: false,
    //     dragging: false,
    //     doubleClickZoom: false,
    //     scrollWheelZoom: false,
    //     touchZoom: false,
    //     boxZoom: false,
    //     tap: false,
    //     keyboard: false,
    //     bounceAtZoomLimits: false,
    //     closePopupOnClick: false,
    //     zoomSnap: 0.5,
    //     pane: 'hawaiiPane',
    //   });

    var CartoDB_PositronNoLabels = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
        pane: 'geojsonPane'
    });

    var CartoDB_PositronOnlyLabels = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
        pane: 'labelsPane'
    });

    CartoDB_PositronNoLabels.addTo(map);

    // CartoDB_PositronNoLabels.addTo(hawaiiMap);

    ////////////////////////////////////////
    ////////// DATA RETRIEVAL ///////////
    ////////////////////////////////////////

    // Store strings used to concatenate API url call to the EIA
    var stateAbbreviations = ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"];

    // Map the array above to create a single string for the API call, so all states' info can be retrieved in one call  
    var stateIdFacets = stateAbbreviations.map(function (stateAbbr) {
        return "facets[stateId][]=" + stateAbbr;
    }).join("&");

    // Define comprehensive call in the EIA's inidicated syntax
    const apiUrl = "https://api.eia.gov/v2/seds/data/?frequency=annual&data[0]=value&" + stateIdFacets + "&facets[seriesId][]=SORCB&facets[seriesId][]=TERCB&start=1989&end=2021&sort[0][column]=period&sort[0][direction]=desc&offset=0&length=5000&api_key=x0saztKAptTeMAuJpxYLwhCAhxv17XSciK1czNo6";

    // Define the URL for the states GeoJSON file
    const statesUrl = 'data/us_states_20m.geojson';

    // Fetch the GeoJSON states file and external API data simultaneously
    Promise.all([
        fetch(statesUrl).then((response) => response.json()),
        fetch(apiUrl).then((response) => response.json()),
    ])
        .then(function (responses) {
            const [states, apiData] = responses;

            // All console-logs left in the document for your convenience in reviewing
            console.log("states_geojson data: ", states);

            // The object within the response that we want to work with contains an array of over 3000 objects which contain state info, by year.

            // Half of the objects contain the total residential energy consumption for the given state in a given year
            // 0: Object { period: 2020, seriesId: "TERCB", seriesDescription: "Total energy consumed by the residential sector", … } 

            // The other half of the objects contain the total residential energy consumption from solar for the given state in a given year
            // 3000: Object { period: 1991, seriesId: "SORCB", seriesDescription: "Solar energy consumed by the residential sector", … }

            // I built the call in the way that I did because there was no apparent logic within the API dashboard itself to precalculate the percentage of the totals that were from solar.

            console.log(`// The object within the response that we want to work with ('response/data')contains an array of over 3000 objects which contain state info, by year.\n\n// Half of the objects contain the total residential energy consumption for the given state in a given year\n\n" 0: Object { period: 2020, seriesId: "TERCB", seriesDescription: "Total energy consumed by the residential sector", … }"\n\n// The other half of the objects contain the total residential energy consumption from solar for the given state in a given year\n\n" 3000: Object { period: 1991, seriesId: "SORCB", seriesDescription: "Solar energy consumed by the residential sector", … }"\n\n// I built the call in the way that I did because there was no apparent logic within the API dashboard itself to precalculate the percentage of the totals that were from solar. \n\nEIA API data: `, apiData);

            processData(apiData, states);
        })
        .catch(function (error) {
            console.log(`Ruh roh! An error has occurred`, error);
        });

    ////////////////////////////////////////
    ////////// DATA PROCESSING /////////////
    ////////////////////////////////////////

    function processData(data, states) {

        // This 'data' object within the data object really tripped me up for awhile! Now I know to look for such!
        var stateData = data.response.data;

        ////////// Calculate the total residential energy consumption for each state and year
        var totalResidentialEnergy = {};
        for (var i = 0; i < stateData.length; i++) {
            var dataPoint = stateData[i];

            // If this is total energy data then...
            if (dataPoint.seriesId === "TERCB") {
                // If there's no state property in our totalResidentialEnergy object, create one
                if (!totalResidentialEnergy[dataPoint.stateDescription]) {
                    totalResidentialEnergy[dataPoint.stateDescription] = {};
                }
                // If the state property in our totalResidentialEnergy object doesn't have a given year's key, create one and assign 0 as its value
                if (!totalResidentialEnergy[dataPoint.stateDescription][dataPoint.period]) {
                    totalResidentialEnergy[dataPoint.stateDescription][dataPoint.period] = 0;
                }
                // If a state property with a year value exists, assign it this iteration's data object's value
                totalResidentialEnergy[dataPoint.stateDescription][dataPoint.period] += dataPoint.value;
            }

        }

        console.log("totalResidentialEnergy: ", totalResidentialEnergy);

        ///////// The code block below 'totalSolarEnergy', follows the same logic as that above for 'totalResidentialEnergy'. I considered making a generic logic inside of a parent loop to generate the objects needed from these two sections, but I feel like that might have been no less verbose, as well as a bit labyrinthine for others to follow, so I left as is.

        ////////// Calculate the total solar energy consumption for each state and year
        var totalSolarEnergy = {};
        for (var i = 0; i < stateData.length; i++) {
            var dataPoint = stateData[i];
            if (dataPoint.seriesId === "SORCB") {
                if (!totalSolarEnergy[dataPoint.stateDescription]) {
                    totalSolarEnergy[dataPoint.stateDescription] = {};
                }
                if (!totalSolarEnergy[dataPoint.stateDescription][dataPoint.period]) {
                    totalSolarEnergy[dataPoint.stateDescription][dataPoint.period] = 0;
                }
                totalSolarEnergy[dataPoint.stateDescription][dataPoint.period] += dataPoint.value;
            }
        }
        console.log("totalSolarEnergy: ", totalSolarEnergy);

        // Calculate the percentage of residential energy consumption that is solar for each state and year
        var solarPercentage = {};
        // Assigns state keys to solarPercentage object by looping over 'totalresidentialEnergy' object
        for (var state in totalResidentialEnergy) {
            solarPercentage[state] = {};
            // Loops over all the years of data for each state in the 'totalresidentialEnergy' object
            for (var year in totalResidentialEnergy[state]) {
                // Get the value of this iteration's year key within this iteration's state object within the totalResidentialEnergy object and save it to the totalResidential variable
                var totalResidential = totalResidentialEnergy[state][year];
                // Get the value (unless absent in which case use 0) of this iteration's year key within this iteration's state object within the totalSolarEnergy object and save it to the totalSolar variable
                var totalSolar = totalSolarEnergy[state][year] || 0;
                // Calculate the percentage of the given state's, given year's total residential energy consumption derived from solar and assign the value to the corresponding year key in the corresponding state object of the solarPercentage object.  
                solarPercentage[state][year] = (totalSolar / totalResidential) * 100;
            }
        }

        console.log("solarPercentage:", solarPercentage);

        ////////// Creating the Breaks

        // Create array to store all values of all of the year keys in all of the state objects within the solarPercentage object 
        const solarRange = [];

        // loop through all the state objects
        for (var state in solarPercentage) {

            // for each state object, loop througha all the year keys
            for (var year in solarPercentage[state]) {
                // Push the value of every year key to the solarRange array
                solarRange.push(solarPercentage[state][year]);
            }
        }

        // create class breaks
        var breaks = chroma.limits(solarRange, 'k', 5);

        // Find the min and max of the solarRange array
        const solarRangeMax = Math.max.apply(null, solarRange);
        const solarRangeMin = Math.min.apply(null, solarRange);

        // create color generator function
        var colorize = chroma.scale(['#34A0A4', '#D9ED92']).domain([solarRangeMin, solarRangeMax])
            .classes(breaks)
            .mode('lab');

        drawMap(solarPercentage, colorize, states);
        drawLegend(breaks, colorize);
    } //end processData()

    ////////////////////////////////////////
    ////// DRAWING/UPDATING THE MAP ////////
    ////////////////////////////////////////

    function drawMap(solarPercentage, colorize, states) {

        const dataLayer = L.geoJson(states, {
            style: function (feature) {
                return {
                    color: "#fff",
                    weight: 0.75,
                    fillOpacity: 0.9,
                    pane: 'geojsonPane'
                };
            },
            // add hover/touch functionality to each feature layer
            onEachFeature: function (feature, layer) {
                if (solarPercentage[layer.feature.properties.NAME]) {
                    layer.feature.properties.solarPercentage = solarPercentage[layer.feature.properties.NAME];
                }
                // when mousing over a layer
                layer.on("mouseover", function () {
                    // change the style
                    layer
                        .setStyle({
                            weight: 2,
                            fillOpacity: 1
                        })
                        .bringToFront();
                });

                // on mousing off layer
                layer.on("mouseout", function () {
                    // reset the layer style
                    layer.setStyle({
                        weight: 0.75,
                        fillOpacity: 0.9
                    });
                });
            }
        }).addTo(map);

        // This is where the second pane seems to break the code. I found a potential workaround for this issue called 'leaflet-vector-layers' (https://github.com/JasonSanford/leaflet-vector-layers) but could not devote any more time to working out a solution before turning in this already woefully late assignment.
        // dataLayer.addTo(hawaiiMap);

        updateMap(dataLayer, solarPercentage, colorize, "1989");
        createSliderUI(dataLayer, solarPercentage, colorize);

    } // end drawMap()

    function updateMap(dataLayer, solarPercentage, colorize, currentYear) {

        const sparkOptions = {
            id: "spark",
            width: 280,
            height: 50,
            color: "green",
            lineWidth: 3
        };

        dataLayer.eachLayer(function (layer) {

            // This feature is broken and I'm at a loss as to how to fix it. I know the answer must lie in the D3 logic inside sparkLine() but I don't see it.
            sparkLine(layer, sparkOptions, currentYear);

            const solarProp = layer.feature.properties.solarPercentage;

            ///////// Determine Layer fill color and popup logic

            // If solarPercentage is present in layer...
            if (solarProp) {
                layer.setStyle({
                    // Set fill color based on currentYear's solarPercentage
                    fillColor: colorize(Number(solarProp[currentYear]))
                });

                // If the given layer(state)'s currentYear value is within valid range...
                if (solarProp[currentYear] &&
                    solarProp[currentYear] > 0 &&
                    solarProp[currentYear] <= 100) {

                    if (solarProp[currentYear] > 0 &&
                        solarProp[currentYear] < 0.01) {

                        var popup = `<span id="spark"></span><h3>In <b>${currentYear} less than 0.01%</b> of <b>${layer.feature.properties.NAME}'s</b> Residential Electricity came from Solar<b/></h3>`;
                    } else {

                        var popup = `<span id="spark"></span><h3>In <b>${currentYear} ${solarProp[currentYear].toFixed(2)}%</b> of <b>${layer.feature.properties.NAME}'s</b> Residential Electricity came from Solar<b/></h3>`;
                    }
                } else { // Otherwise if value is outside of valid range (see Alaska 1997-2008)
                    layer.setStyle({
                        fillColor: "white"
                    });
                    var popup = `<h3><b>${layer.feature.properties.NAME}</b><br>${currentYear} Data Unavailable</h3>`;
                }
            } else { // Otherwise if solarPercentage is NOT present in layer (see Puerto Rico)
                layer.setStyle({
                    fillColor: "white"
                });
                var popup = `<h3><b>${layer.feature.properties.NAME}</b><br>${currentYear} Data Unavailable</h3>`;
            }
            layer.bindPopup(popup);
        });

        //Ensure proper layering of Labels on each map update
        CartoDB_PositronOnlyLabels.addTo(map);

    } // end updateMap()

    function sparkLine(data, options, currentYear) {

        // console.log("Data = geoJSON feature: ", data);

        // Clear previous svg
        d3.select(`#${options.id} svg`).remove();

        // Create array to store full range of data being passed in
        var stateRange = [];

        // Loop through data object and push values to stateRange array
        var stateProps = data.feature.properties;
        for (var year in stateProps.solarPercentage) {
            stateRange.push(stateProps.solarPercentage[year]);
        }

        // console.log("stateRange array (data given to D3): ", stateRange);

        const w = options.width,
            h = options.height,
            m = {
                top: 5,
                right: 5,
                bottom: 5,
                left: 5,
            },
            iw = w - m.left - m.right,
            ih = h - m.top - m.bottom,
            x = d3.scaleLinear().domain([1989, 2020]).range([0, iw]),
            y = d3
                .scaleLinear()
                .domain([d3.min(stateRange), d3.max(stateRange)])
                .range([ih, 0]);

        const svg = d3
            .select(`#${options.id}`)
            .append("svg")
            .attr("width", w)
            .attr("height", h)
            .append("g")
            .attr("transform", `translate(${m.left},${m.top})`);

        const line = d3
            .line()
            .x((d, i) => x(i))
            .y((d) => y(d));

        const area = d3
            .area()
            .x((d, i) => x(i))
            .y0(d3.min(stateRange))
            .y1((d) => y(d));

        svg
            .append("path")
            .datum(stateRange)
            .attr("stroke-width", 0)
            .attr("fill", options.color)
            .attr("opacity", 0.5)
            .attr("d", area);

        svg
            .append("path")
            .datum(stateRange)
            .attr("fill", "none")
            .attr("stroke", options.color)
            .attr("stroke-width", options.lineWidth)
            .attr("d", line);

        svg
            .append("circle")
            .attr("cx", x(Number(currentYear) - 1))
            .attr("cy", y(Number(stateProps[currentYear]) - 1))
            .attr("r", "4px")
            .attr("fill", "white")
            .attr("stroke", options.color)
            .attr("stroke-width", options.lineWidth / 2);
    }

    ////////////////////////////////////////
    ////////// LEAFLET CONTROLS //////////
    ////////////////////////////////////////

    function drawLegend(breaks, colorize) {
        // create a Leaflet control for the legend
        const legendControl = L.control({
            position: "topright",
        });

        // when the control is added to the map
        legendControl.onAdd = function (map) {
            // create a new division element with class of 'legend' and return
            const legend = L.DomUtil.create("div", "legend");
            return legend;
        };

        // add the legend control to the map
        legendControl.addTo(map);

        // select div and create legend title
        const legend = document.querySelector(".legend");
        legend.innerHTML = `<h3><span>1989</span>Percent of Residential<br>Power from Solar</h3>`;

        // I changed the structure here because the browser was closing the ul tag early for some reason (before the loop ran) and it was offsetting the spans in the legend.
        let listItems = `<li><span style="background:white"></span> No Data </li>`;

        // loop through the break values and concatenate listItems string
        for (let i = 0; i < breaks.length - 1; i++) {

            const color = colorize(breaks[i], breaks);

            // create legend item
            const classRange = `<li><span style="background:${color}"></span>
        ${breaks[i].toFixed(2)}% &mdash;
        ${breaks[i + 1].toFixed(2)}% </li>`;

            // append to legend unordered list item
            listItems += classRange;
        }

        // creates the unordered list and adds the list items to it
        const unorderedList = `<ul>${listItems}<li><a href = "" id="see-hawaii">Special Focus on Hawaii</a></li></ul>`;
  
        // adds the unordered list to the legend
        legend.innerHTML += unorderedList;

        ////////// MY MAKESHIFT SOLUTION TO THE HAWAII PROBLEM //////////
        
        // Select link
        var seeHawaii = document.querySelector("#see-hawaii");

        //Set toggle state
        var viewHawaii = false;

        // Set event listener on Link
        seeHawaii.addEventListener("click", function(event) {
            // Prevent rerender
            event.preventDefault();
            if (viewHawaii == false) {
                // Change the center and zoom level of the map to focus on Hawaii
                map.setView([19.8968, -155.5828], 7);
                // Update Legend
                seeHawaii.innerHTML = "Return to full scope";
                viewHawaii = true;
            } else {
                // Change the center and zoom level of the map to focus on Hawaii
                map.setView([52, -122], 3.75);
                // Update Legend
                seeHawaii.innerHTML = "Special Focus on Hawaii";
                viewHawaii = false;
            }
            
        });


    } // end drawLegend()

    function createSliderUI(dataLayer, solarPercentage, colorize) {

        // create Leaflet control for the slider
        const sliderControl = L.control({ position: "bottomleft" });

        // update the year
        const year = document.querySelector("#current-year");

        // when added to the map
        sliderControl.onAdd = function (map) {
            // select an existing DOM element with an id of "ui-controls"
            const slider = L.DomUtil.get("ui-controls");

            // disable scrolling of map while using controls
            L.DomEvent.disableScrollPropagation(slider);

            // disable click events while using controls
            L.DomEvent.disableClickPropagation(slider);

            // return the slider from the onAdd method
            return slider;
        };

        // add the control to the map
        sliderControl.addTo(map);
        // select the form element
        const slider = document.querySelector(".year-slider");

        // listen for changes on input element
        slider.addEventListener("input", function (e) {
            // get the value of the selected option
            const currentYear = e.target.value;
            // update the map with current timestamp
            updateMap(dataLayer, solarPercentage, colorize, currentYear);
            // update timestamp in legend heading
            document.querySelector(".legend h3 span").innerHTML = currentYear;
            // update the year
            year.innerHTML = currentYear;
        });

        // Store play/pause button
        var autoplayToggle = document.querySelector("#autoplay-toggle");

        // Initiate autoplay state
        var autoplay;

        // Assign interval actions to autoplay
        autoplay = setInterval(function () {
            // Store currently selected value from slider
            let currentValue = Number(slider.value);
            // Store target value
            let nextValue = currentValue + 1;
            // Validate target value
            if (nextValue > Number(slider.max)) {
                //if invalid, reset slider value to min value
                slider.value = 1989;
            } else {
                // Otherwise assign new target value
                slider.value = nextValue;
            }
            // Update map and legend with new values
            updateMap(dataLayer, solarPercentage, colorize, slider.value);
            document.querySelector(".legend h3 span").innerHTML = slider.value;
            // Update the year in the slider
            year.innerHTML = slider.value;
        }, 500);
        // Set button text to 'pause'
        autoplayToggle.textContent = "Pause";

        // Event handler listens for clicks on th eplay/pause button, and when clicked calls the handleAutoplayToggle callback function
        autoplayToggle.addEventListener("click", handleAutoplayToggle);

        // Handles autoplay state logic
        function handleAutoplayToggle() {
            // If autoplay is 'on', clears interval (pasues) and resets button text to 'Play'
            if (autoplay) {
                clearInterval(autoplay);
                autoplay = null;
                autoplayToggle.textContent = "Play";
            } else {
                // If autoplay is 'off' sets interval (plays), auto advances slider, and updates map accordingly
                autoplay = setInterval(() => {
                    let currentValue = parseInt(slider.value);
                    let nextValue = currentValue + 1;
                    // Logic to advance slider value or reset value when the slider max is reached (2020)
                    if (nextValue > parseInt(slider.max)) {
                        slider.value = 1989;
                    } else {
                        slider.value = nextValue;
                    }
                    // Updates map based on slider's current value
                    updateMap(dataLayer, solarPercentage, colorize, slider.value);
                    // Updates legend year
                    document.querySelector(".legend h3 span").innerHTML = slider.value;
                    // Updates slider year
                    year.innerHTML = slider.value;
                }, 500);
                autoplayToggle.textContent = "Pause";
            }
        } // end handleAutoplayToggle()

    } // end createSliderUI()

})();