#target photoshop

if (app.showColorPicker()) {
    var pickedColor = [
        Math.round(app.foregroundColor.rgb.red),
        Math.round(app.foregroundColor.rgb.green),
        Math.round(app.foregroundColor.rgb.blue)
    ];
} else {
    // fallback if user cancels
    var pickedColor = [0, 128, 255]; 
}
// ===== Config =====
var targetGroupName = "Tabs"; // group name to process everywhere
var baseColor = pickedColor; // or parseColor([0, 128, 255])
var opacityStep = 50; // % less opacity per step
var tabsColorMixType = "luminance"; // luminance or opacity
var tabsColorMixTo = "light"; // light or dark

// Lists (edit these names)
var textLayers = ["MainText"]; // change their text color
var solidLayers = ["TextBG"]; // change shape / content color
var overlayColor = ["Pattern"]; // change their overlay fill color

// ===== Helpers =====
// 🔹 Helper: Convert HEX or RGB to RGB array
function parseColor(input) {
    if (typeof input === "string") {
        // Remove '#' if present
        var hex = input.replace(/^#/, "");
        if (hex.length === 3) {
            // Expand shorthand hex (#f90 → #ff9900)
            hex = hex
                .split("")
                .map(function (c) {
                    return c + c;
                })
                .join("");
        }
        var bigint = parseInt(hex, 16);
        return [
            (bigint >> 16) & 255, // R
            (bigint >> 8) & 255, // G
            bigint & 255, // B
        ];
    } else if (Array.isArray(input)) {
        // Already an RGB array
        return input;
    } else {
        throw new Error("Invalid color format. Use HEX (#RRGGBB) or [R,G,B]");
    }
}
// Convert RGB → HSL
function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    var max = Math.max(r, g, b),
        min = Math.min(r, g, b);
    var h,
        s,
        l = (max + min) / 2;

    if (max == min) {
        h = s = 0; // gray
    } else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h /= 6;
    }
    return [h, s, l];
}

// Convert HSL → RGB
function hslToRgb(h, s, l) {
    var r, g, b;
    if (s == 0) {
        r = g = b = l; // gray
    } else {
        function hue2rgb(p, q, t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        }
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function toLowerArray(arr) {
    var out = [];
    for (var i = 0; i < arr.length; i++) out.push(String(arr[i]).toLowerCase());
    return out;
}
var textLayersLower = toLowerArray(textLayers);
var solidLayersLower = toLowerArray(solidLayers);
var overlayColorLower = toLowerArray(overlayColor);

function arrContains(arr, value) {
    var v = String(value).toLowerCase();
    for (var i = 0; i < arr.length; i++) {
        if (String(arr[i]).toLowerCase() === v) return true;
    }
    return false;
}

function selectLayerById(id) {
    var d = new ActionDescriptor();
    var r = new ActionReference();
    r.putIdentifier(charIDToTypeID("Lyr "), id);
    d.putReference(charIDToTypeID("null"), r);
    executeAction(charIDToTypeID("slct"), d, DialogModes.NO);
}

function setActiveContentLayerColor(rgb) {
    var d = new ActionDescriptor();
    var r = new ActionReference();
    r.putEnumerated(stringIDToTypeID("contentLayer"), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
    d.putReference(charIDToTypeID("null"), r);

    var colorWrap = new ActionDescriptor();
    var rgbDesc = new ActionDescriptor();
    rgbDesc.putDouble(charIDToTypeID("Rd  "), rgb[0]);
    rgbDesc.putDouble(charIDToTypeID("Grn "), rgb[1]);
    rgbDesc.putDouble(charIDToTypeID("Bl  "), rgb[2]);
    colorWrap.putObject(charIDToTypeID("Clr "), charIDToTypeID("RGBC"), rgbDesc);

    d.putObject(charIDToTypeID("T   "), stringIDToTypeID("solidColorLayer"), colorWrap);
    executeAction(charIDToTypeID("setd"), d, DialogModes.NO);
}

function applyColorOverlay(rgb) {
    var ref = new ActionReference();
    ref.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));

    var color = new ActionDescriptor();
    color.putDouble(charIDToTypeID("Rd  "), rgb[0]);
    color.putDouble(charIDToTypeID("Grn "), rgb[1]);
    color.putDouble(charIDToTypeID("Bl  "), rgb[2]);

    var sofi = new ActionDescriptor();
    sofi.putBoolean(charIDToTypeID("enab"), true);
    sofi.putUnitDouble(charIDToTypeID("Opct"), charIDToTypeID("#Prc"), 100.0);
    sofi.putObject(charIDToTypeID("Clr "), charIDToTypeID("RGBC"), color);

    var fx = new ActionDescriptor();
    fx.putObject(stringIDToTypeID("solidFill"), stringIDToTypeID("solidFill"), sofi);

    var setFX = new ActionDescriptor();
    setFX.putReference(charIDToTypeID("null"), ref);
    setFX.putObject(charIDToTypeID("T   "), stringIDToTypeID("layerEffects"), fx);

    executeAction(charIDToTypeID("setd"), setFX, DialogModes.NO);
}

function changeLayerColor(layer, rgb, forceOverlay) {
    try {
        if (layer.kind == LayerKind.TEXT) {
            var c = new SolidColor();
            c.rgb.red = rgb[0];
            c.rgb.green = rgb[1];
            c.rgb.blue = rgb[2];
            layer.textItem.color = c;
        } else {
            selectLayerById(layer.id);
            if (forceOverlay) {
                applyColorOverlay(rgb);
            } else {
                try {
                    setActiveContentLayerColor(rgb);
                } catch (e) {
                    applyColorOverlay(rgb);
                }
            }
        }
    } catch (e) {
        $.writeln("Skipped " + layer.name + " : " + e.message);
    }
}

function processTabsGroup(group) {
    if (tabsColorMixType === "opacity") {
        var all = group.artLayers;
        for (var i = 0; i < all.length; i++) {
            var lyr = all[i];
            changeLayerColor(lyr, baseColor, false);
            lyr.opacity = Math.max(0, 100 - i * opacityStep);
        }
    } else {
		var luminanceStep = 0.1;
		var newLightness;
        for (var i = 0; i < group.artLayers.length; i++) {
            var lyr = group.artLayers[i];

            // Convert baseColor to HSL
            var hsl = rgbToHsl(baseColor[0], baseColor[1], baseColor[2]);

            // Decrease lightness for each step (instead of opacity)
			if(tabsColorMixTo ==="light"){
				newLightness = Math.min(1, hsl[2] + (i * luminanceStep));
			}else{
				newLightness = Math.max(0, hsl[2] - i * 0.1); // 10% darker per step
			}
            var newRgb = hslToRgb(hsl[0], hsl[1], newLightness);

            // Apply new color
            changeLayerColor(lyr, newRgb);

            lyr.opacity = 100; // keep full opacity
        }
    }
}

function findAndProcessTabs(container) {
    for (var i = 0; i < container.layerSets.length; i++) {
        var ls = container.layerSets[i];
        if (ls.name == targetGroupName) {
            processTabsGroup(ls);
        }
        findAndProcessTabs(ls);
    }
}

// ✅ Recursive search for named layers everywhere
function processNamedLayers(container) {
    var changed = 0;
    for (var i = 0; i < container.layers.length; i++) {
        var lyr = container.layers[i];
        if (lyr.typename == "ArtLayer") {
            var nameLower = String(lyr.name).toLowerCase();
            $.writeln("🔍 Found layer: " + lyr.name); // <-- debug log

            if (arrContains(textLayersLower, nameLower)) {
                $.writeln("✅ Matched TEXT: " + lyr.name);
                changeLayerColor(lyr, baseColor, false);
                changed++;
            } else if (arrContains(solidLayersLower, nameLower)) {
                $.writeln("✅ Matched SOLID: " + lyr.name);
                changeLayerColor(lyr, baseColor, false);
                changed++;
            } else if (arrContains(overlayColorLower, nameLower)) {
                $.writeln("✅ Matched OVERLAY: " + lyr.name);
                changeLayerColor(lyr, baseColor, true);
                changed++;
            }
        } else if (lyr.typename == "LayerSet") {
            changed += processNamedLayers(lyr); // 🔁 recurse into subfolder
        }
    }
    return changed;
}

// ===== Main =====
try {
    var doc = app.activeDocument;
    findAndProcessTabs(doc); // process all Tabs folders
    var count = processNamedLayers(doc); // process other named layers
    alert("✅ Done. Named layers updated: " + count);
} catch (e) {
    alert("❌ Error: " + e.message);
}
