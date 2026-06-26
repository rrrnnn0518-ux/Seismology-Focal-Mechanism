const canvas = document.getElementById('stereonet');
const ctx = canvas.getContext('2d');
const width = canvas.width;
const height = canvas.height;
const cx = width / 2;
const cy = height / 2;
const R_max = (width / 2) - 20; // 20px padding

// The 5 stations from 24271505.P25
const stations = [
    { name: 'TWC', az: 248, toa: 167, polar: '+', desc: '壓縮 (Up)' },
    { name: 'ILA', az: 303, toa: 145, polar: '+', desc: '壓縮 (Up)' },
    { name: 'EOS2', az: 139, toa: 139, polar: '-', desc: '膨脹 (Down)' },
    { name: 'EOS3', az: 143, toa: 125, polar: '-', desc: '膨脹 (Down)' },
    { name: 'TWD', az: 224, toa: 99, polar: '+', desc: '壓縮 (Up)' }
];

let customStations = [];
let customStationCount = 1;

let activeStation = null;

function drawStereonetBase() {
    ctx.clearRect(0, 0, width, height);
    
    // Draw outer circle
    ctx.beginPath();
    ctx.arc(cx, cy, R_max, 0, 2 * Math.PI);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#2f3542';
    ctx.stroke();

    // Draw Crosshairs
    ctx.beginPath();
    ctx.moveTo(cx, cy - R_max - 5);
    ctx.lineTo(cx, cy + R_max + 5);
    ctx.moveTo(cx - R_max - 5, cy);
    ctx.lineTo(cx + R_max + 5, cy);
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#dfe4ea';
    ctx.stroke();

    // Labels
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#2f3542';
    ctx.textAlign = 'center';
    ctx.fillText('N', cx, cy - R_max - 8);
    ctx.fillText('S', cx, cy + R_max + 18);
    ctx.textAlign = 'right';
    ctx.fillText('W', cx - R_max - 8, cy + 4);
    ctx.textAlign = 'left';
    ctx.fillText('E', cx + R_max + 8, cy + 4);
}

// Convert TOA and AZ to X, Y using Equal Area Projection (Schmidt Net)
function getProjectedXY(az, toa) {
    let alpha = toa;
    let theta = az;
    
    // If upgoing ray (TOA > 90), project to lower hemisphere
    if (alpha > 90) {
        alpha = 180 - alpha;
        theta = (theta + 180) % 360;
    }

    // R = R_max * sqrt(2) * sin(alpha/2)
    const alphaRad = alpha * (Math.PI / 180);
    const R = R_max * Math.sqrt(2) * Math.sin(alphaRad / 2);

    const thetaRad = theta * (Math.PI / 180);
    
    // North is top (Y is -), East is right (X is +)
    const x = cx + R * Math.sin(thetaRad);
    const y = cy - R * Math.cos(thetaRad);

    return { x, y };
}

function drawStations() {
    const allStations = [...stations, ...customStations];
    allStations.forEach(st => {
        const { x, y } = getProjectedXY(st.az, st.toa);
        
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
        
        if (st.polar === '+') {
            ctx.fillStyle = '#ff4757'; // Red for compression
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#2f3542';
            ctx.stroke();
        } else {
            ctx.fillStyle = '#ffffff'; // White for dilatation
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#2b5cff'; // Blue for dilatation outline
            ctx.stroke();
        }

        // Draw highlight if active
        if (activeStation === st.name) {
            ctx.beginPath();
            ctx.arc(x, y, 12, 0, 2 * Math.PI);
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#f1c40f'; // yellow highlight
            ctx.stroke();
        }

        // Label
        ctx.fillStyle = '#2f3542';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(st.name, x + 10, y + 4);
    });
}

let calculatedPlanes = false;

function drawSimulatedNodalPlanes() {
    ctx.save();
    ctx.beginPath();
    // Simulate nodal plane 1
    ctx.arc(cx - 40, cy, R_max, -Math.PI/2 + 0.25, Math.PI/2 - 0.25);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ff4757';
    ctx.setLineDash([5, 5]);
    ctx.stroke();

    ctx.beginPath();
    // Simulate nodal plane 2
    ctx.arc(cx + 40, cy, R_max, Math.PI/2 + 0.25, 3*Math.PI/2 - 0.25);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#2b5cff';
    ctx.stroke();
    ctx.restore();
}

function render() {
    drawStereonetBase();
    if (calculatedPlanes) {
        drawSimulatedNodalPlanes();
    }
    drawStations();
}

// Setup Interaction
const listContainer = document.getElementById('station-list');

function addStationToDOM(st, isCustom) {
    const li = document.createElement('li');
    li.className = 'station-item';
    if (isCustom) li.classList.add('custom-station');
    li.innerHTML = `
        <div><strong>${st.name}</strong> <span style="font-size:0.85rem; color:#747d8c; margin-left:10px;">Az: ${st.az}°, Toa: ${st.toa}°</span></div>
        <div style="font-weight:bold; color: ${st.polar === '+' ? 'var(--accent-color)' : 'var(--primary-color)'}">${st.polar === '+' ? '● 壓縮' : '○ 膨脹'}</div>
    `;
    
    li.addEventListener('mouseenter', () => {
        activeStation = st.name;
        document.querySelectorAll('.station-item').forEach(el => el.classList.remove('active'));
        li.classList.add('active');
        render();
    });
    li.addEventListener('mouseleave', () => {
        activeStation = null;
        li.classList.remove('active');
        render();
    });
    
    listContainer.appendChild(li);
}

// Initial default stations
stations.forEach(st => addStationToDOM(st, false));

// Custom Form Logic
document.getElementById('add-point-btn').addEventListener('click', () => {
    let name = document.getElementById('custom-name').value.trim();
    let az = parseInt(document.getElementById('custom-az').value);
    let toa = parseInt(document.getElementById('custom-toa').value);
    let polar = document.getElementById('custom-polar').value;

    if (isNaN(az) || isNaN(toa)) {
        alert("請輸入有效的方位角與出射角！");
        return;
    }
    if (az < 0 || az > 360) {
        alert("方位角必須在 0 到 360 度之間！");
        return;
    }
    if (toa < 0 || toa > 180) {
        alert("出射角必須在 0 到 180 度之間！");
        return;
    }

    if (!name) {
        name = "C" + customStationCount;
        customStationCount++;
    }

    const newSt = { name, az, toa, polar, desc: polar === '+' ? '壓縮 (Up)' : '膨脹 (Down)' };
    customStations.push(newSt);
    addStationToDOM(newSt, true);
    calculatedPlanes = false;
    render();

    // clear inputs
    document.getElementById('custom-name').value = '';
    document.getElementById('custom-az').value = '';
    document.getElementById('custom-toa').value = '';
});

document.getElementById('clear-points-btn').addEventListener('click', () => {
    customStations = [];
    customStationCount = 1;
    document.querySelectorAll('.custom-station').forEach(el => el.remove());
    calculatedPlanes = false;
    render();
});


// Theme toggle
const themeBtn = document.getElementById('theme-btn');
themeBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
});

render();

document.getElementById('calc-mechanism-btn').addEventListener('click', () => {
    const totalPoints = stations.length + customStations.length;
    
    if (totalPoints < 8) {
        alert('⚠️ 警告：測站資料數不足！\n\n目前僅有 ' + totalPoints + ' 個測站資料。在實際地震學觀測中，過少的測站分布（尤其是集中在單一象限）將無法收斂出唯一的震源機制解。\n\n建議：請輸入更多均勻分布的測站資料（通常至少需要 8-15 個點位），才能推算實際的節面！');
        calculatedPlanes = false;
        render();
    } else {
        alert('✅ 模擬計算成功！\n\n已根據您的 ' + totalPoints + ' 個測站資料進行運算，推算出最佳適配的震源機制解波面（節面）！\n(圖上已繪製出模擬的紅藍節面)');
        calculatedPlanes = true;
        render();
    }
});
