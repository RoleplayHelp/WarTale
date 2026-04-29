class StorageService {
    constructor(storageKey) { this.storageKey = storageKey; }
    save(data) { localStorage.setItem(this.storageKey, JSON.stringify(data)); }
    load() { const data = localStorage.getItem(this.storageKey); return data ? JSON.parse(data) : null; }
}

// ==========================================
// HỆ THỐNG CLASS & ĐA HÌNH (POLYMORPHISM CORE)
// ==========================================

class BaseCharacter {
    constructor(id, name, priorityTarget, usesPot = true) {
        this.id = id;
        this.name = name;
        this.priority = `Ưu tiên: ${priorityTarget}`;
        this.usesPot = usesPot;
    }

    getPOTDefinition() { return "POT"; }

    calculateCommonDerived(stats, baseStat) {
        const realHp = stats.hp * 5;
        
        // 1. Tính toán RES (Kháng Debuff)
        let vit = this.id === 'healer' ? stats.pot : 0;
        let res = stats.def + vit;
        if (this.id === 'tanker' && stats.hp >= (baseStat * 0.4)) {
            res = stats.def + stats.hp; 
        }

        // 2. Tính toán Lực kéo đẩy (Khả năng chống lực kéo đẩy)
        let pushPull = stats.atk + stats.def;
        if (this.id === 'tanker' && stats.hp >= (baseStat * 0.4)) {
            pushPull = stats.hp + stats.atk + stats.def;
        }

        // 3. Tính toán INFL (Khả năng gây Debuff)
        let aff = this.id === 'debuffer' ? stats.pot : 0;
        let infl = stats.atk + aff;

        // 4. Tính toán TEN (Độ bám dính của Skill)
        let maxClassStat = Math.max(stats.atk, stats.def, stats.fort, stats.pot || 0);
        let ten = Math.max(maxClassStat, baseStat * 0.3); 
        
        if (this.id === 'tanker' && stats.hp >= (baseStat * 0.4)) {
            ten = Math.max(ten, stats.hp); 
        }

        return {
            hpLimit: (realHp * 0.7).toFixed(1),
            realHp: realHp,
            carryWeight: Math.max(stats.atk, 30),
            pushPull: pushPull,
            moveSpeed: (stats.spd * 0.2).toFixed(1),
            refSpeed: (stats.ref * 2 * 0.2).toFixed(1),
            res: res,
            infl: infl,
            ten: ten,
            fort: stats.fort
        };
    }

    generateCombatInfo(stats, baseStat) {
        const common = this.calculateCommonDerived(stats, baseStat);
        let infoHTML = '';
        
        infoHTML += `<li><strong>Lượng HP hồi tối đa mỗi turn (Ngoại trừ Lifesteal):</strong> <span>${common.hpLimit}</span> (70% của ${common.realHp} HP)</li>`;
        infoHTML += `<li><strong>Sức mang vác:</strong> <span>${common.carryWeight} kg</span> (Max của ATK hoặc 30)</li>`;
        
        let pushPullText = `(ATK + DEF)`;
        if (this.id === 'tanker' && stats.hp >= (baseStat * 0.4)) {
            pushPullText = `(100% HP gốc + ATK + DEF)`; // Hidden mechanic
        }
        infoHTML += `<li><strong>Khả năng chống lực kéo đẩy:</strong> <span>${common.pushPull}</span> ${pushPullText}</li>`;
        
        infoHTML += `<li><strong>Tốc độ di chuyển:</strong> <span>${common.moveSpeed} m/s</span></li>`;
        infoHTML += `<li><strong>Tốc độ phản xạ:</strong> <span>${common.refSpeed} m/s</span></li>`;
        
        let resText = this.id === 'healer' ? `(DEF + POT[VIT])` : `(DEF)`;
        if (this.id === 'tanker' && stats.hp >= (baseStat * 0.4)) {
            resText = `(DEF + 100% HP gốc)`; // Hidden mechanic
        }
        infoHTML += `<li><strong>Kháng debuff (RES):</strong> <span>${common.res}</span> ${resText}</li>`;
        
        if (common.fort > 0) {
            infoHTML += `<li><strong>Khả năng chặn debuff của Khiên:</strong> <span>${common.fort}</span> (100% FORT)</li>`;
        }

        // Render INFL - Chỉ dành cho Attacker và Debuffer
        if (this.id === 'attacker' || this.id === 'debuffer') {
            let inflText = this.id === 'debuffer' ? `(ATK + POT[AFF])` : `(ATK)`;
            infoHTML += `<li><strong>Khả năng gây debuff (INFL):</strong> <span>${common.infl}</span> ${inflText}</li>`;
        }

        let tenText = `(Max của Class Stat cao nhất hoặc 30% Base)`;
        if (this.id === 'tanker' && stats.hp >= (baseStat * 0.4)) {
            tenText = `(100% HP gốc, Class Stat max, hoặc 30% Base)`; // Hidden mechanic
        }
        infoHTML += `<li><strong>Độ bám dính của Skill (TEN):</strong> <span>${common.ten} Ten</span> ${tenText}</li>`;

        return { common, infoHTML };
    }
}

// --- KHAI BÁO CÁC CLASS CỤ THỂ ---

class Attacker extends BaseCharacter {
    constructor() { super('attacker', 'Attacker', 'ATK', false); } 
    getPOTDefinition() { return "Không sử dụng"; }
    generateCombatInfo(stats, baseStat) {
        return super.generateCombatInfo(stats, baseStat).infoHTML; 
    }
}

class Tanker extends BaseCharacter {
    constructor() { super('tanker', 'Tanker', 'HP / DEF / FORT', false); } 
    getPOTDefinition() { return "Không sử dụng"; }
    generateCombatInfo(stats, baseStat) {
        return super.generateCombatInfo(stats, baseStat).infoHTML; 
    }
}

class Healer extends BaseCharacter {
    constructor() { super('healer', 'Healer', 'POT (VIT)', true); }
    getPOTDefinition() { return "POT (VIT)"; }
    generateCombatInfo(stats, baseStat) {
        return super.generateCombatInfo(stats, baseStat).infoHTML; 
    }
}

class Supporter extends BaseCharacter {
    constructor() { super('supporter', 'Supporter', 'POT (AST)', true); } 
    getPOTDefinition() { return "POT (AST)"; }
    generateCombatInfo(stats, baseStat) {
        return super.generateCombatInfo(stats, baseStat).infoHTML; 
    }
}

class Debuffer extends BaseCharacter {
    constructor() { super('debuffer', 'Debuffer', 'ATK / POT (AFF)', true); }
    getPOTDefinition() { return "POT (AFF)"; }
    generateCombatInfo(stats, baseStat) {
        return super.generateCombatInfo(stats, baseStat).infoHTML;
    }
}

class Scouter extends BaseCharacter {
    constructor() { super('scouter', 'Scouter', 'SPD / POT (INS)', true); }
    getPOTDefinition() { return "POT (INS)"; }
    generateCombatInfo(stats, baseStat) {
        let { infoHTML } = super.generateCombatInfo(stats, baseStat);
        infoHTML += `<li><strong>Khả năng trinh sát:</strong> <span>${stats.pot}</span> (Dựa trên INS)</li>`;
        infoHTML += `<li><strong>Khả năng phản trinh sát:</strong> <span>${stats.pot * 0.8}</span> (80% INS)</li>`;
        return infoHTML;
    }
}

class Summoner extends BaseCharacter {
    constructor() { super('summoner', 'Summoner', 'POT (MAN)', true); }
    getPOTDefinition() { return "POT (MAN)"; }
    generateCombatInfo(stats, baseStat) {
        return super.generateCombatInfo(stats, baseStat).infoHTML; 
    }
}

// Registry quản lý Classes
const CharacterSystem = {
    attacker: new Attacker(), tanker: new Tanker(), healer: new Healer(),
    supporter: new Supporter(), debuffer: new Debuffer(), scouter: new Scouter(), summoner: new Summoner()
};

// ==========================================
// LOGIC TÍNH TOÁN & VALIDATE
// ==========================================
class StatCalculator {
    constructor() { this.statNames = ['hp', 'spd', 'ref', 'atk', 'def', 'fort', 'pot']; }
    getRequirements(baseStat) {
        return { hp: Math.ceil(baseStat * 0.20), spd: Math.ceil(baseStat * 0.10), ref: Math.ceil(baseStat * 0.10) };
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

// ==========================================
// UI CONTROLLER
// ==========================================
class UIController {
    constructor() {
        this.inputs = {}; this.outputs = {}; this.outputRows = {};
        this.DOM = {
            charClass: document.getElementById('charClass'), baseStat: document.getElementById('baseStat'),
            resClassName: document.getElementById('res-class-name'), resPriority: document.getElementById('res-priority'),
            resBase: document.getElementById('res-base'), resRemaining: document.getElementById('res-remaining'),
            remainingBox: document.getElementById('remaining-box'), combatInfo: document.getElementById('combat-info'),
            labelPot: document.getElementById('label-pot')
        };
        this.initElements();
    }

    initElements() {
        for (const key in CharacterSystem) {
            const option = document.createElement('option');
            option.value = key; option.textContent = CharacterSystem[key].name;
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
        return { charClass: this.DOM.charClass.value, baseStat: parseInt(this.DOM.baseStat.value) || 0, stats: stats };
    }

    setFormData(data) {
        this.DOM.charClass.value = data.charClass;
        this.DOM.baseStat.value = data.baseStat;
        for (const key in data.stats) { if (this.inputs[key]) this.inputs[key].value = data.stats[key] || ''; }
    }

    bindEvents(callback) {
        this.DOM.charClass.addEventListener('change', callback);
        this.DOM.baseStat.addEventListener('input', callback);
        for (const key in this.inputs) { this.inputs[key].addEventListener('input', callback); }
    }

    render(data, remaining, errors, requirements) {
        const activeClass = CharacterSystem[data.charClass];

        this.DOM.resClassName.textContent = activeClass.name;
        this.DOM.resPriority.textContent = activeClass.priority;
        this.DOM.resBase.textContent = data.baseStat;
        this.DOM.resRemaining.textContent = remaining;

        if (remaining < 0) this.DOM.remainingBox.classList.add('error-box');
        else this.DOM.remainingBox.classList.remove('error-box');

        const potGroup = this.DOM.labelPot.closest('.form-group');
        const outPotRow = this.outputRows['pot'];
        if (!activeClass.usesPot) {
            potGroup.style.display = 'none';
            outPotRow.style.display = 'none';
            data.stats.pot = 0; 
        } else {
            potGroup.style.display = 'flex';
        }
        this.DOM.labelPot.textContent = activeClass.getPOTDefinition();

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

        for (const key in data.stats) {
            let statValue = data.stats[key];
            if (key === 'hp') this.outputs[key].textContent = statValue * 5;
            else this.outputs[key].textContent = statValue;
            
            if (key !== 'pot' || activeClass.usesPot) {
                if (statValue === 0) this.outputRows[key].style.display = 'none';
                else this.outputRows[key].style.display = 'flex';
            }
        }

        this.DOM.combatInfo.innerHTML = `<ul class="combat-list">${activeClass.generateCombatInfo(data.stats, data.baseStat)}</ul>`;
    }
}

// ==========================================
// APP CORE
// ==========================================
class App {
    constructor(storage, calculator, ui) {
        this.storage = storage; this.calculator = calculator; this.ui = ui;
        this.defaultData = {
            charClass: 'attacker', baseStat: 300,
            stats: { hp: 60, spd: 30, ref: 30, atk: 0, def: 0, fort: 0, pot: 0 }
        };
        this.init();
    }

    init() {
        const savedData = this.storage.load();
        if(savedData && savedData.stats && savedData.stats.pot === undefined) savedData.stats.pot = 0;
        
        this.ui.setFormData(savedData || this.defaultData);
        this.ui.bindEvents(() => this.process());
        
        document.getElementById('btn-clear').addEventListener('click', () => {
            if(confirm('Bạn có muốn làm mới toàn bộ chỉ số không?')) {
                this.storage.save(this.defaultData);
                this.ui.setFormData(this.defaultData);
                this.process();
            }
        });

        document.getElementById('btn-copy').addEventListener('click', () => {
            const className = document.getElementById('res-class-name').innerText;
            const priority = document.getElementById('res-priority').innerText;
            const base = document.getElementById('res-base').innerText;
            const remaining = document.getElementById('res-remaining').innerText;
            
            let text = `=== KẾT QUẢ BUILD STAT ===\nClass: ${className} (${priority})\nBase Stat: ${base} | Remaining: ${remaining}\n\n[ CHỈ SỐ CƠ BẢN ]\n`;
            document.querySelectorAll('.stat-row').forEach(row => {
                if(row.style.display !== 'none') text += `- ${row.querySelector('span').innerText} ${row.querySelector('strong').innerText}\n`;
            });

            text += `\n[ THÔNG TIN CHIẾN ĐẤU ]\n`;
            document.querySelectorAll('#combat-info li').forEach(li => {
                text += `- ${li.innerText.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()}\n`;
            });

            navigator.clipboard.writeText(text).then(() => {
                const btn = document.getElementById('btn-copy');
                btn.innerHTML = '✅ Đã Copy!'; btn.classList.add('btn-success');
                setTimeout(() => { btn.innerHTML = '📋 Copy Kết Quả'; btn.classList.remove('btn-success'); }, 2000);
            });
        });

        this.process(); 
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
    new App(new StorageService('characterBuildStats_vFinal3'), new StatCalculator(), new UIController());
});