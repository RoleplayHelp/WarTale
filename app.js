class StorageService {
    constructor(storageKey) { this.storageKey = storageKey; }
    save(data) { localStorage.setItem(this.storageKey, JSON.stringify(data)); }
    load() { const data = localStorage.getItem(this.storageKey); return data ? JSON.parse(data) : null; }
}

const CharacterClasses = {
    attacker: { id: 'attacker', name: 'Attacker', priority: 'Ưu tiên: ATK' },
    tanker: { id: 'tanker', name: 'Tanker', priority: 'Ưu tiên: HP / DEF / FORT' },
    supporter: { id: 'supporter', name: 'Supporter', priority: 'Ưu tiên: AST' },
    debuffer: { id: 'debuffer', name: 'Debuffer', priority: 'Ưu tiên: AST' },
    healer: { id: 'healer', name: 'Healer', priority: 'Ưu tiên: VIT' },
    scouter: { id: 'scouter', name: 'Scouter', priority: 'Ưu tiên: IFL' }
};

class StatCalculator {
    constructor() { this.statNames = ['hp', 'spd', 'ref', 'atk', 'def', 'fort', 'ifl', 'ast', 'man', 'vit']; }
    getRequirements(baseStat) {
        return {
            hp: Math.ceil(baseStat * 0.20),
            spd: Math.ceil(baseStat * 0.10),
            ref: Math.ceil(baseStat * 0.10)
        };
    }
    calculateTotalUsed(stats) { return this.statNames.reduce((total, stat) => total + (stats[stat] || 0), 0); }
    validate(stats, baseStat) {
        const req = this.getRequirements(baseStat);
        const errors = {};
        if (stats.hp < req.hp) errors.hp = `Tối thiểu ${req.hp} (20%)`;
        if (stats.spd < req.spd) errors.spd = `Tối thiểu ${req.spd} (10%)`;
        if (stats.ref < req.ref) errors.ref = `Tối thiểu ${req.ref} (10%)`;
        return errors;
    }
}

class UIController {
    constructor() {
        this.inputs = {};
        this.outputs = {};
        this.outputRows = {};
        this.DOM = {
            charClass: document.getElementById('charClass'),
            baseStat: document.getElementById('baseStat'),
            resClassName: document.getElementById('res-class-name'),
            resPriority: document.getElementById('res-priority'),
            resBase: document.getElementById('res-base'),
            resRemaining: document.getElementById('res-remaining'),
            remainingBox: document.getElementById('remaining-box'),
            combatInfo: document.getElementById('combat-info')
        };
        this.initElements();
    }

    initElements() {
        for (const key in CharacterClasses) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = CharacterClasses[key].name;
            this.DOM.charClass.appendChild(option);
        }
        document.querySelectorAll('.stat-input').forEach(input => {
            const statKey = input.dataset.stat;
            this.inputs[statKey] = input;
            this.outputs[statKey] = document.getElementById(`out-${statKey}`);
            this.outputRows[statKey] = this.outputs[statKey].closest('.stat-row');
        });
    }

    getFormData() {
        const stats = {};
        for (const key in this.inputs) { stats[key] = parseInt(this.inputs[key].value) || 0; }
        return {
            charClass: this.DOM.charClass.value,
            baseStat: parseInt(this.DOM.baseStat.value) || 0,
            stats: stats
        };
    }

    setFormData(data) {
        this.DOM.charClass.value = data.charClass;
        this.DOM.baseStat.value = data.baseStat;
        for (const key in data.stats) {
            if (this.inputs[key]) this.inputs[key].value = data.stats[key] || '';
        }
    }

    bindEvents(callback) {
        this.DOM.charClass.addEventListener('change', callback);
        this.DOM.baseStat.addEventListener('input', callback);
        for (const key in this.inputs) { this.inputs[key].addEventListener('input', callback); }
    }

    render(data, remaining, errors, requirements) {
        const currentClass = CharacterClasses[data.charClass];
        this.DOM.resClassName.textContent = currentClass.name;
        this.DOM.resPriority.textContent = currentClass.priority;
        this.DOM.resBase.textContent = data.baseStat;
        this.DOM.resRemaining.textContent = remaining;

        if (remaining < 0) this.DOM.remainingBox.classList.add('error-box');
        else this.DOM.remainingBox.classList.remove('error-box');

        document.getElementById('label-hp').textContent = `HP (Min ${requirements.hp}):`;
        document.getElementById('label-spd').textContent = `SPD (Min ${requirements.spd}):`;
        document.getElementById('label-ref').textContent = `REF (Min ${requirements.ref}):`;

        ['hp', 'spd', 'ref'].forEach(key => {
            document.getElementById(`err-${key}`).textContent = '';
            this.inputs[key].classList.remove('input-error');
        });

        for (const key in errors) {
            document.getElementById(`err-${key}`).textContent = errors[key];
            this.inputs[key].classList.add('input-error');
        }

        // 1. Render Basic Stats & Ẩn stat = 0
        for (const key in data.stats) {
            let statValue = data.stats[key];
            if (key === 'hp') this.outputs[key].textContent = statValue * 5;
            else this.outputs[key].textContent = statValue;
            
            if (statValue === 0) this.outputRows[key].style.display = 'none';
            else this.outputRows[key].style.display = 'flex';
        }

        // 2. Tính toán Derived Stats
        const stats = data.stats;
        let maxVal = 0, maxName = '';
        for (const [k, v] of Object.entries(stats)) {
            if (v > maxVal) { maxVal = v; maxName = k.toUpperCase(); }
        }

        const realHp = stats.hp * 5;
        const hpLimit = (realHp * 0.7).toFixed(1);
        const carryWeight = Math.max(stats.atk, 30);
        const pushPull = stats.atk + stats.def;
        const moveSpeed = (stats.spd * 0.2).toFixed(1);
        const refSpeed = (stats.ref * 2 * 0.2).toFixed(1);
        const res = stats.def + stats.vit;
        const atkAst = stats.atk + stats.ast;
        const inflVal = Math.max(atkAst, maxVal);
        const inflText = (inflVal === atkAst && atkAst > maxVal) ? "100% ATK + 100% AST" : `100% ${maxName}`;

        // 3. Render Derived Stats HTML
        let combatHTML = `<ul class="combat-list">`;
        combatHTML += `<li><strong>Giới hạn HP + Fake HP/turn:</strong> <span>${hpLimit}</span> (70% của ${realHp} HP)</li>`;
        combatHTML += `<li><strong>Sức mang vác tối đa:</strong> <span>${carryWeight} kg</span></li>`;
        combatHTML += `<li><strong>Sức chịu lực kéo/đẩy max:</strong> <span>${pushPull}</span> (ATK + DEF)</li>`;
        combatHTML += `<li><strong>Tốc độ di chuyển max:</strong> <span>${moveSpeed} m/s</span></li>`;
        combatHTML += `<li><strong>Phản xạ với đối tượng max:</strong> <span>${refSpeed} m/s</span></li>`;
        if (stats.ifl > 0) combatHTML += `<li><strong>Trinh sát & Chống trinh sát:</strong> <span>${stats.ifl}</span> (100% IFL)</li>`;
        combatHTML += `<li><strong>Chống Debuff (RES):</strong> <span>${res}</span> (DEF + VIT)</li>`;
        combatHTML += `<li><strong>Độ mạnh Skill (POT):</strong> <span>${maxVal}</span> (100% ${maxName} - Stat cao nhất)</li>`;
        combatHTML += `<li><strong>Độ xuyên Skill (INFL):</strong> <span>${inflVal}</span> (${inflText})</li>`;
        combatHTML += `<li><strong>Độ bám dính Skill (TEN):</strong> <span>${maxVal}</span> (100% ${maxName} - Stat cao nhất)</li>`;
        combatHTML += `</ul>`;
        this.DOM.combatInfo.innerHTML = combatHTML;
    }
}

class App {
    constructor(storage, calculator, ui) {
        this.storage = storage;
        this.calculator = calculator;
        this.ui = ui;
        this.defaultData = {
            charClass: 'attacker', baseStat: 300,
            stats: { hp: 60, spd: 30, ref: 30, atk: 0, def: 0, fort: 0, ifl: 0, ast: 0, man: 0, vit: 0 }
        };
        this.init();
    }

    init() {
        const savedData = this.storage.load();
        this.ui.setFormData(savedData || this.defaultData);
        this.ui.bindEvents(() => this.process());
        this.bindButtons(); // Gắn sự kiện cho các nút
        this.process();
    }

    bindButtons() {
        // Xử lý nút Clear
        document.getElementById('btn-clear').addEventListener('click', () => {
            if(confirm('Bạn có chắc chắn muốn xóa toàn bộ số liệu và làm mới lại từ đầu không?')) {
                this.storage.save(this.defaultData);
                this.ui.setFormData(this.defaultData);
                this.process();
            }
        });

        // Xử lý nút Copy
        document.getElementById('btn-copy').addEventListener('click', () => {
            this.copyToClipboard();
        });
    }

    copyToClipboard() {
        const className = document.getElementById('res-class-name').innerText;
        const priority = document.getElementById('res-priority').innerText;
        const base = document.getElementById('res-base').innerText;
        const remaining = document.getElementById('res-remaining').innerText;
        
        let text = `=== KẾT QUẢ BUILD STAT ===\n`;
        text += `Class: ${className} (${priority})\n`;
        text += `Base Stat: ${base} | Remaining: ${remaining}\n\n`;
        
        text += `[ CHỈ SỐ CƠ BẢN ]\n`;
        document.querySelectorAll('.stat-row').forEach(row => {
            if(row.style.display !== 'none') {
                const label = row.querySelector('span').innerText;
                const val = row.querySelector('strong').innerText;
                text += `- ${label} ${val}\n`;
            }
        });

        text += `\n[ THÔNG TIN CHIẾN ĐẤU ]\n`;
        document.querySelectorAll('#combat-info li').forEach(li => {
            // Loại bỏ khoảng trắng thừa và nối dòng
            const cleanText = li.innerText.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
            text += `- ${cleanText}\n`;
        });

        // Ghi vào Clipboard
        navigator.clipboard.writeText(text).then(() => {
            const btn = document.getElementById('btn-copy');
            const originalText = btn.innerHTML;
            btn.innerHTML = '✅ Đã Copy!';
            btn.classList.add('btn-success');
            
            // Trả lại nút như cũ sau 2 giây
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.classList.remove('btn-success');
            }, 2000);
        }).catch(err => alert('Không thể copy. Trình duyệt của bạn có thể chặn tính năng này!'));
    }

    process() {
        const data = this.ui.getFormData();
        const totalUsed = this.calculator.calculateTotalUsed(data.stats);
        const remaining = data.baseStat - totalUsed;
        const errors = this.calculator.validate(data.stats, data.baseStat);
        const requirements = this.calculator.getRequirements(data.baseStat);

        this.ui.render(data, remaining, errors, requirements);
        this.storage.save(data);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new App(new StorageService('characterBuildStats'), new StatCalculator(), new UIController());
});