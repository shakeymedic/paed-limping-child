// ===================== STORAGE =====================
const STORAGE_KEY = 'paed_limp_data';

// ===================== COPY RICH TEXT (exact required implementation) =====================
async function copyRichText() {
    const el = document.getElementById('epr-output');
    if (!el) return;
    const htmlContent = el.innerHTML;
    const plainText = el.innerText;
    const copyBtn = document.getElementById('copy-rich-text-btn');
    try {
        if (navigator.clipboard && window.ClipboardItem) {
            await navigator.clipboard.write([
                new ClipboardItem({
                    'text/html': new Blob([htmlContent], { type: 'text/html' }),
                    'text/plain': new Blob([plainText], { type: 'text/plain' })
                })
            ]);
        } else {
            await navigator.clipboard.writeText(plainText);
        }
        if (copyBtn) {
            const orig = copyBtn.textContent;
            copyBtn.textContent = '✓ Copied!';
            copyBtn.classList.add('bg-green-600');
            copyBtn.classList.remove('bg-blue-600');
            setTimeout(() => {
                copyBtn.textContent = orig;
                copyBtn.classList.remove('bg-green-600');
                copyBtn.classList.add('bg-blue-600');
            }, 1500);
        }
    } catch(e) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('copy');
        sel.removeAllRanges();
        if (copyBtn) { copyBtn.textContent = '✓ Copied!'; setTimeout(() => { copyBtn.textContent = 'Copy Rich Text'; }, 1500); }
    }
}
window.copyRichText = copyRichText;

document.addEventListener('DOMContentLoaded', () => {
    const $ = (id) => document.getElementById(id);
    const val = (id) => ($(id) ? $(id).value : '');

    // ===================== UTILITIES =====================
    function findCheckedRadio(name) {
        const radios = document.getElementsByName(name);
        for (let i = 0; i < radios.length; i++) {
            if (radios[i].checked) return radios[i].value;
        }
        return '';
    }

    function checkedValues(selector) {
        return Array.from(document.querySelectorAll(selector))
            .filter(el => el.checked)
            .map(el => el.value);
    }

    function showHide(el, show) {
        if (!el) return;
        el.classList.toggle('hidden', !show);
    }

    function calcAge(dobStr) {
        if (!dobStr) return '';
        const dob = new Date(dobStr);
        if (isNaN(dob.getTime())) return '';
        const now = new Date();
        let years = now.getFullYear() - dob.getFullYear();
        let months = now.getMonth() - dob.getMonth();
        let days = now.getDate() - dob.getDate();
        if (days < 0) { months -= 1; }
        if (months < 0) { years -= 1; months += 12; }
        if (years < 1) {
            // show months for infants
            let totalMonths = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
            if (now.getDate() < dob.getDate()) totalMonths -= 1;
            if (totalMonths < 0) totalMonths = 0;
            return totalMonths + ' month' + (totalMonths === 1 ? '' : 's');
        }
        return years + ' year' + (years === 1 ? '' : 's') + (months > 0 ? ', ' + months + ' mo' : '');
    }

    function getAgeYears() {
        if (!$('p_dob') || !$('p_dob').value) return null;
        const dob = new Date($('p_dob').value);
        if (isNaN(dob.getTime())) return null;
        const now = new Date();
        let years = now.getFullYear() - dob.getFullYear();
        const months = now.getMonth() - dob.getMonth();
        if (months < 0 || (months === 0 && now.getDate() < dob.getDate())) years -= 1;
        return years;
    }

    // ===================== CONDITIONAL VISIBILITY WIRING =====================
    function wireYesNo(radioName, wrapId, showOnValue = 'Yes') {
        document.getElementsByName(radioName).forEach(r => {
            r.addEventListener('change', () => {
                showHide($(wrapId), findCheckedRadio(radioName) === showOnValue);
            });
        });
    }

    wireYesNo('fever_present', 'fever_temp_wrap');
    wireYesNo('recent_illness', 'illness_ago_wrap');
    wireYesNo('recent_trauma', 'trauma_details_wrap');
    wireYesNo('recent_vaccination', 'vaccination_details_wrap');
    wireYesNo('morning_stiffness', 'stiffness_duration_wrap');
    wireYesNo('previous_episodes', 'previous_episodes_details_wrap');
    wireYesNo('leg_length_discrepancy', 'leg_length_measured_wrap');
    wireYesNo('xray_requested', 'xray_details_wrap');
    wireYesNo('us_hip_requested', 'us_details_wrap');
    wireYesNo('analgesia_given', 'analgesia_details_wrap');
    wireYesNo('antibiotics_given', 'antibiotics_which_wrap');

    document.getElementsByName('ortho_referral').forEach(r => {
        r.addEventListener('change', () => {
            const v = findCheckedRadio('ortho_referral');
            showHide($('ortho_urgency_wrap'), v === 'Yes' || v === 'Pending');
        });
    });

    if ($('most_likely_dx')) {
        $('most_likely_dx').addEventListener('change', () => {
            showHide($('most_likely_dx_other'), $('most_likely_dx').value === 'Other (free text)');
        });
    }

    // ===================== TEMP / RESULT FLAGS =====================
    function checkTempFlag() {
        const t = parseFloat(val('exam_temp'));
        showHide($('temp_flag'), !isNaN(t) && t > 38.5);
    }
    if ($('exam_temp')) $('exam_temp').addEventListener('input', checkTempFlag);

    function checkResultFlags() {
        const wbc = parseFloat(val('result_wbc'));
        const crp = parseFloat(val('result_crp'));
        const esr = parseFloat(val('result_esr'));
        showHide($('wbc_flag'), !isNaN(wbc) && wbc > 12000);
        showHide($('crp_flag'), !isNaN(crp) && crp > 20);
        showHide($('esr_flag'), !isNaN(esr) && esr >= 40);
    }
    ['result_wbc', 'result_crp', 'result_esr'].forEach(id => {
        if ($(id)) $(id).addEventListener('input', checkResultFlags);
    });

    // ===================== AGE CALCULATION =====================
    function updateAge() {
        if ($('p_dob') && $('p_age')) {
            $('p_age').value = calcAge($('p_dob').value);
        }
    }
    if ($('p_dob')) $('p_dob').addEventListener('change', updateAge);

    // ===================== KOCHER CRITERIA CALCULATOR =====================
    const KOCHER_RESULTS = {
        0: { prob: '16.9%', label: 'Unlikely septic arthritis', action: 'Continue standard assessment; consider transient synovitis', tier: 'green' },
        1: { prob: '36.7%', label: 'Low probability', action: 'Close observation; consider transient synovitis; review inflammatory markers', tier: 'green' },
        2: { prob: '62.4%', label: 'Moderate probability — consider aspiration', action: 'Discuss with orthopaedics; consider joint aspiration', tier: 'amber' },
        3: { prob: '82.6%', label: 'High probability — urgent orthopaedics', action: 'Urgent orthopaedic referral required', tier: 'red' },
        4: { prob: '93.1%', label: 'Very high — emergency orthopaedics', action: 'Emergency orthopaedic referral required', tier: 'red' },
        5: { prob: '97.5%', label: 'Treat as septic arthritis', action: 'Treat as septic arthritis — emergency orthopaedics + IV antibiotics', tier: 'red' }
    };

    function getKocherScore() {
        const items = ['kocher_fever', 'kocher_nwb', 'kocher_esr', 'kocher_wbc', 'kocher_crp'];
        let score = 0;
        let answered = 0;
        items.forEach(name => {
            const v = findCheckedRadio(name);
            if (v) answered++;
            if (v === 'Yes') score++;
        });
        return { score, answered };
    }

    function updateKocher() {
        const { score } = getKocherScore();
        const result = KOCHER_RESULTS[score] || KOCHER_RESULTS[0];
        if ($('kocherScoreDisplay')) $('kocherScoreDisplay').textContent = score + ' / 5';
        if ($('kocherProbDisplay')) $('kocherProbDisplay').textContent = result.prob + ' — ' + result.label;
        if ($('kocherActionDisplay')) $('kocherActionDisplay').textContent = result.action;

        const card = $('kocherResultCard');
        if (card) {
            card.classList.remove(
                'bg-slate-50', 'border-slate-300',
                'bg-green-50', 'border-green-400',
                'bg-amber-50', 'border-amber-400',
                'bg-red-50', 'border-red-500'
            );
            if (result.tier === 'green') {
                card.classList.add('bg-green-50', 'border-green-400');
            } else if (result.tier === 'amber') {
                card.classList.add('bg-amber-50', 'border-amber-400');
            } else {
                card.classList.add('bg-red-50', 'border-red-500');
            }
        }
        return score;
    }

    document.querySelectorAll('.kocher-input').forEach(el => {
        el.addEventListener('change', () => { updateKocher(); updateRedFlags(); updateNotes(); saveState(); });
    });

    // ===================== pGALS =====================
    document.querySelectorAll('#pgals_gait_normal, #pgals_arms_normal, #pgals_legs_normal, #pgals_spine_normal').forEach(el => {
        if (el) el.addEventListener('change', () => { updateNotes(); saveState(); });
    });
    if ($('pgals_notes')) $('pgals_notes').addEventListener('input', () => { updateNotes(); saveState(); });

    // ===================== RED FLAG AUTO-HIGHLIGHTING =====================
    function updateRedFlags() {
        const flags = {};

        const ageYears = getAgeYears();

        flags.age_lt3 = (ageYears !== null && ageYears < 3);
        flags.age_gt9_hip = (ageYears !== null && ageYears > 9 &&
            (findCheckedRadio('hip_pain_movement') === 'Yes' || checkedValues('.pain-loc').includes('Hip')));

        flags.unable_wb = findCheckedRadio('weight_bearing') === 'Non-weight-bearing';

        flags.pseudoparesis = ($('rf_pseudoparesis_manual') && $('rf_pseudoparesis_manual').checked);

        const temp = parseFloat(val('exam_temp'));
        flags.fever = (!isNaN(temp) && temp > 38.5) || findCheckedRadio('fever_present') === 'Yes';

        const generalApp = findCheckedRadio('general_appearance');
        flags.unwell_toxic = (generalApp === 'Unwell' || generalApp === 'Toxic');

        flags.lymphadenopathy_hsm = ($('rf_lymphadenopathy_manual') && $('rf_lymphadenopathy_manual').checked);

        flags.night_pain = findCheckedRadio('night_pain') === 'Yes';

        flags.multi_joint_6wk = ($('rf_multijoint_manual') && $('rf_multijoint_manual').checked);

        const { score } = getKocherScore();
        flags.kocher3 = score >= 3;

        const constitutional = checkedValues('.constitutional');
        const mostLikely = val('most_likely_dx');
        const differentials = checkedValues('.differential');
        const pmh = checkedValues('.pmh');
        flags.malignancy = mostLikely === 'Neoplastic (e.g. ALL)' ||
            differentials.includes('Neoplastic (e.g. ALL)') ||
            pmh.includes('Malignancy') ||
            ($('rf_malignancy_manual') && $('rf_malignancy_manual').checked);

        flags.neurovascular = $('rf_neurovascular_manual') && $('rf_neurovascular_manual').checked;
        flags.nai = $('rf_nai_manual') && $('rf_nai_manual').checked;

        document.querySelectorAll('.redflag-row').forEach(row => {
            const key = row.getAttribute('data-flag');
            const isFlagged = !!flags[key];
            row.classList.toggle('flagged', isFlagged);
            const badge = row.querySelector('.redflag-badge');
            if (badge) badge.classList.toggle('hidden', !isFlagged);
        });

        return flags;
    }

    ['rf_neurovascular_manual', 'rf_nai_manual', 'rf_malignancy_manual', 'rf_pseudoparesis_manual', 'rf_lymphadenopathy_manual', 'rf_multijoint_manual'].forEach(id => {
        if ($(id)) $(id).addEventListener('change', () => { updateRedFlags(); updateNotes(); saveState(); });
    });

    // ===================== EPR NOTE GENERATOR =====================
    function line(label, value) {
        if (value === undefined || value === null || value === '') return '';
        return label + ': ' + value + '\n';
    }

    function updateNotes() {
        let n = '';
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' });
        const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

        n += 'LIMPING CHILD ASSESSMENT [' + dateStr + ' ' + timeStr + ']\n';
        n += '========================================\n\n';

        // --- Patient summary ---
        n += 'PATIENT SUMMARY\n';
        n += line('Name', val('p_name'));
        n += line('DOB', val('p_dob'));
        n += line('Age', val('p_age'));
        n += line('Weight', val('p_weight') ? val('p_weight') + ' kg' : '');
        n += line('Gender', val('p_gender'));
        n += line('Side Affected', findCheckedRadio('side_affected'));
        n += line('Onset', findCheckedRadio('onset'));
        n += line('Duration of Symptoms', val('duration_symptoms'));
        n += line('Referral Source', val('p_referral'));
        if (val('presenting_complaint')) n += line('Presenting Complaint', val('presenting_complaint'));
        n += '\n';

        // --- History summary ---
        n += 'HISTORY SUMMARY\n';
        const painLoc = checkedValues('.pain-loc');
        n += line('Pain Location', painLoc.join(', '));
        n += line('Pain Character', val('pain_character'));
        n += line('Pain Score', val('pain_score') ? val('pain_score') + '/10' : '');
        n += line('Weight Bearing', findCheckedRadio('weight_bearing'));
        const feverPresent = findCheckedRadio('fever_present');
        n += line('Fever', feverPresent === 'Yes' ? 'Yes' + (val('fever_temp') ? ' (' + val('fever_temp') + '°C)' : '') : feverPresent);
        const illness = findCheckedRadio('recent_illness');
        n += line('Recent Illness/URTI', illness === 'Yes' ? 'Yes' + (val('illness_ago') ? ' (' + val('illness_ago') + ')' : '') : illness);
        const trauma = findCheckedRadio('recent_trauma');
        n += line('Recent Trauma', trauma === 'Yes' ? 'Yes — ' + val('trauma_details') : trauma);
        const vacc = findCheckedRadio('recent_vaccination');
        n += line('Recent Vaccination', vacc === 'Yes' ? 'Yes — ' + val('vaccination_which') + (val('vaccination_ago') ? ' (' + val('vaccination_ago') + ')' : '') : vacc);
        const stiff = findCheckedRadio('morning_stiffness');
        n += line('Morning Stiffness', stiff === 'Yes' ? 'Yes' + (val('stiffness_duration') ? ' (' + val('stiffness_duration') + ' min)' : '') : stiff);
        n += line('Worse With', findCheckedRadio('worse_with'));
        n += line('Night Pain', findCheckedRadio('night_pain'));
        const constitutional = checkedValues('.constitutional');
        if (constitutional.length) n += line('Constitutional Symptoms', constitutional.join(', '));
        const prevEp = findCheckedRadio('previous_episodes');
        n += line('Previous Episodes', prevEp === 'Yes' ? 'Yes — ' + val('previous_episodes_details') : prevEp);
        const pmh = checkedValues('.pmh');
        if (pmh.length) n += line('PMH', pmh.join(', '));
        n += '\n';

        // --- Examination ---
        n += 'EXAMINATION FINDINGS\n';
        n += line('Temperature', val('exam_temp') ? val('exam_temp') + '°C' : '');
        n += line('Heart Rate', val('exam_hr'));
        n += line('Other Obs', val('exam_obs'));
        n += line('General Appearance', findCheckedRadio('general_appearance'));
        n += 'Testicular Torsion Reminder: Torsion can present as a limp — examine testes\n';
        const gait = checkedValues('.gait');
        if (gait.length) n += line('Gait', gait.join(', '));
        const limbSigns = checkedValues('.limb-sign');
        if (limbSigns.length) n += line('Affected Limb', limbSigns.join(', '));
        n += line('Hip IR/ER/Flexion/Abduction', [val('hip_ir'), val('hip_er'), val('hip_flexion'), val('hip_abduction')].some(v => v) ?
            'IR ' + (val('hip_ir') || '-') + '° / ER ' + (val('hip_er') || '-') + '° / Flexion ' + (val('hip_flexion') || '-') + '° / Abduction ' + (val('hip_abduction') || '-') + '°' : '');
        n += line('Pain on Hip Movement', findCheckedRadio('hip_pain_movement'));
        n += line('Log Roll Test', findCheckedRadio('log_roll'));
        const kneeExam = checkedValues('.knee-exam');
        if (kneeExam.length) n += line('Knee Examination', kneeExam.join(', '));
        n += line('Spine Assessment', findCheckedRadio('spine_assessment'));
        n += line('Thomas Test', findCheckedRadio('thomas_test'));
        n += line('FABER Test', findCheckedRadio('faber_test'));
        const legLength = findCheckedRadio('leg_length_discrepancy');
        n += line('Leg Length Discrepancy', legLength === 'Yes' ? 'Yes' + (val('leg_length_measured') ? ' (' + val('leg_length_measured') + ' cm)' : '') : legLength);

        // pGALS
        n += '\npGALS SCREENING\n';
        n += line('Gait', $('pgals_gait_normal') && $('pgals_gait_normal').checked ? 'Normal' : 'Not confirmed normal / see notes');
        n += line('Arms', $('pgals_arms_normal') && $('pgals_arms_normal').checked ? 'Normal' : 'Not confirmed normal / see notes');
        n += line('Legs', $('pgals_legs_normal') && $('pgals_legs_normal').checked ? 'Normal' : 'Not confirmed normal / see notes');
        n += line('Spine', $('pgals_spine_normal') && $('pgals_spine_normal').checked ? 'Normal' : 'Not confirmed normal / see notes');
        n += line('pGALS Notes', val('pgals_notes'));
        n += '\n';

        // --- Kocher / Septic arthritis criteria ---
        const { score } = getKocherScore();
        const result = KOCHER_RESULTS[score] || KOCHER_RESULTS[0];
        n += 'KOCHER CRITERIA — SEPTIC ARTHRITIS OF THE HIP\n';
        n += 'Kocher score ' + score + '/5 — ' + result.prob + ' — ' + result.label + '\n';
        n += 'Action: ' + result.action + '\n';
        n += line('  Fever >38.5°C', findCheckedRadio('kocher_fever'));
        n += line('  Unable to bear weight', findCheckedRadio('kocher_nwb'));
        n += line('  ESR >40mm in first hour', findCheckedRadio('kocher_esr'));
        n += line('  WCC >12 x10^9/L', findCheckedRadio('kocher_wbc'));
        n += line('  CRP >20mg/L (Caird)', findCheckedRadio('kocher_crp'));
        n += 'NOTE: Septic arthritis can still be present in the absence of these criteria.\n';
        n += 'Management: If features consistent with septic arthritis (severe pain OR range of movement <75% normal) → urgent orthopaedics.\n';
        n += '\n';

        // --- Investigations ---
        n += 'INVESTIGATIONS\n';
        n += 'Guideline: FBC + blood film, ESR, CRP, blood cultures if febrile. X-ray 2 views (site of pain + pelvis). If SUFE suspected: AP + frog lateral. If osteomyelitis/persisting symptoms: MRI pelvis ± contrast (paediatric radiologist), bone scan, CT (in addition to MRI). CK, sickle cell screen.\n';
        n += 'If suspicion of transient synovitis or septic arthritis: joint aspiration, microscopy and culture — cannot usually be differentiated by ultrasound; requires laboratory and clinical correlation.\n';
        const bloods = checkedValues('.bloods');
        if (bloods.length) n += line('Bloods Ordered', bloods.join(', '));
        n += line('WBC', val('result_wbc'));
        n += line('CRP', val('result_crp'));
        n += line('ESR', val('result_esr'));
        const xrayReq = findCheckedRadio('xray_requested');
        if (xrayReq === 'Yes') {
            const views = checkedValues('.xray-view');
            n += line('X-Ray Views', views.join(', '));
            n += line('X-Ray Result', val('xray_result'));
            n += line('X-Ray Notes', val('xray_notes'));
        } else if (xrayReq) {
            n += line('X-Ray Requested', xrayReq);
        }
        const usReq = findCheckedRadio('us_hip_requested');
        if (usReq === 'Yes') {
            n += line('US Hip Effusion', findCheckedRadio('us_effusion'));
            n += line('US Hip Volume', val('us_volume') ? val('us_volume') + ' ml' : '');
        } else if (usReq) {
            n += line('US Hip Requested', usReq);
        }
        n += line('MRI Requested', findCheckedRadio('mri_requested'));
        n += line('Bone Scan', findCheckedRadio('bone_scan'));
        n += '\n';

        // --- Differential diagnosis ---
        n += 'MOST LIKELY DIAGNOSIS / DIFFERENTIALS\n';
        const mostLikely = val('most_likely_dx');
        n += line('Most Likely Diagnosis', mostLikely === 'Other (free text)' ? val('most_likely_dx_other') : mostLikely);
        const differentials = checkedValues('.differential');
        if (differentials.length) n += line('Differential Diagnoses', differentials.join(', '));
        n += '\n';

        // --- Red flags ---
        const flags = updateRedFlags();
        const flagLabels = {
            age_lt3: 'Age <3yr',
            unable_wb: 'Unable to weight bear',
            pseudoparesis: 'Pseudoparesis',
            fever: 'Fever',
            unwell_toxic: 'Systemically unwell',
            lymphadenopathy_hsm: 'Lymphadenopathy / hepatosplenomegaly',
            night_pain: 'Night pain / night sweats',
            multi_joint_6wk: 'Multiple joints affected / symptoms >6 weeks',
            age_gt9_hip: 'Age >9yr with pain / restricted hip movement',
            kocher3: 'Kocher score ≥3',
            malignancy: 'Suspected malignancy',
            neurovascular: 'Neurovascular compromise',
            nai: 'Suspected non-accidental injury'
        };
        const activeFlags = Object.keys(flags).filter(k => flags[k]).map(k => flagLabels[k]);
        n += 'RED FLAGS (LOCAL GUIDELINE)\n';
        n += activeFlags.length ? activeFlags.join('\n') + '\n' : 'No red flags triggered\n';
        n += '\n';

        // --- Management ---
        n += 'MANAGEMENT PLAN\n';
        const analgesia = findCheckedRadio('analgesia_given');
        n += line('Analgesia Given', analgesia === 'Yes' ? 'Yes — ' + val('analgesia_details') : analgesia);
        const ortho = findCheckedRadio('ortho_referral');
        n += line('Orthopaedics Referral', ortho ? ortho + (val('ortho_urgency') ? ' (' + val('ortho_urgency') + ')' : '') : '');
        n += line('Rheumatology Referral', findCheckedRadio('rheum_referral'));
        n += line('Haematology/Oncology Referral', findCheckedRadio('haem_onc_referral'));
        const abx = findCheckedRadio('antibiotics_given');
        n += line('Antibiotics', abx === 'Yes' ? 'Yes — ' + val('antibiotics_which') : abx);
        n += line('Joint Aspiration', findCheckedRadio('joint_aspiration'));
        n += '\n';

        // --- Disposition ---
        n += 'DISPOSITION\n';
        n += line('Disposition', val('disposition'));
        n += line('Safety Netting Advice Given', findCheckedRadio('safety_netting'));
        n += line('Follow-Up', val('followup_type') ? val('followup_type') + (val('followup_details') ? ' — ' + val('followup_details') : '') : '');
        n += line('Responsible Clinician', val('responsible_clinician'));
        n += line('Senior Review By', val('senior_review'));

        if ($('epr-output')) $('epr-output').innerText = n;
    }
    window.updateNotes = updateNotes;

    // ===================== AUTO-SAVE / LOAD =====================
    function saveState() {
        const data = {};
        document.querySelectorAll('input, textarea, select').forEach(el => {
            if (el.type === 'checkbox') {
                data[el.id || (el.className + ':' + el.value)] = el.checked;
            } else if (el.type === 'radio') {
                if (el.checked) data['radio:' + el.name] = el.value;
            } else if (el.id) {
                data[el.id] = el.value;
            }
        });
        // Persist checkbox groups with class-based identity (no id)
        document.querySelectorAll('input[type=checkbox]').forEach((el, idx) => {
            const key = el.id ? el.id : 'chk_' + Array.from(document.querySelectorAll('input[type=checkbox]')).indexOf(el);
            data[key] = el.checked;
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        const status = $('saveStatus');
        if (status) {
            status.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Saved';
            setTimeout(() => {
                status.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Auto-save';
            }, 1200);
        }
    }

    function loadState() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) { return; }
        try {
            const data = JSON.parse(saved);
            const allCheckboxes = document.querySelectorAll('input[type=checkbox]');
            document.querySelectorAll('input, textarea, select').forEach(el => {
                if (el.type === 'checkbox') {
                    const key = el.id ? el.id : 'chk_' + Array.from(allCheckboxes).indexOf(el);
                    if (data[key] !== undefined) el.checked = data[key];
                } else if (el.type === 'radio') {
                    if (data['radio:' + el.name] === el.value) el.checked = true;
                } else if (el.id && data[el.id] !== undefined) {
                    el.value = data[el.id];
                }
            });

            // Re-trigger conditional visibility
            showHide($('fever_temp_wrap'), findCheckedRadio('fever_present') === 'Yes');
            showHide($('illness_ago_wrap'), findCheckedRadio('recent_illness') === 'Yes');
            showHide($('trauma_details_wrap'), findCheckedRadio('recent_trauma') === 'Yes');
            showHide($('vaccination_details_wrap'), findCheckedRadio('recent_vaccination') === 'Yes');
            showHide($('stiffness_duration_wrap'), findCheckedRadio('morning_stiffness') === 'Yes');
            showHide($('previous_episodes_details_wrap'), findCheckedRadio('previous_episodes') === 'Yes');
            showHide($('leg_length_measured_wrap'), findCheckedRadio('leg_length_discrepancy') === 'Yes');
            showHide($('xray_details_wrap'), findCheckedRadio('xray_requested') === 'Yes');
            showHide($('us_details_wrap'), findCheckedRadio('us_hip_requested') === 'Yes');
            showHide($('analgesia_details_wrap'), findCheckedRadio('analgesia_given') === 'Yes');
            showHide($('antibiotics_which_wrap'), findCheckedRadio('antibiotics_given') === 'Yes');
            const orthoV = findCheckedRadio('ortho_referral');
            showHide($('ortho_urgency_wrap'), orthoV === 'Yes' || orthoV === 'Pending');
            if ($('most_likely_dx')) showHide($('most_likely_dx_other'), $('most_likely_dx').value === 'Other (free text)');

            updateAge();
            checkTempFlag();
            checkResultFlags();
            updateKocher();
            updateRedFlags();
        } catch (e) {
            console.error('Load error', e);
        }
    }

    // ===================== WIRE UP GLOBAL CHANGE LISTENERS =====================
    function refreshAll() {
        updateAge();
        checkTempFlag();
        checkResultFlags();
        updateKocher();
        updateRedFlags();
        updateNotes();
        saveState();
    }

    document.querySelectorAll('input, textarea, select').forEach(el => {
        el.addEventListener('change', refreshAll);
        if (el.tagName === 'TEXTAREA' || el.type === 'text' || el.type === 'number' || el.type === 'date') {
            el.addEventListener('input', refreshAll);
        }
    });

    // ===================== RESET =====================
    if ($('resetData')) {
        $('resetData').addEventListener('click', () => {
            if (!confirm('Reset the entire form? This cannot be undone.')) return;
            localStorage.removeItem(STORAGE_KEY);
            document.querySelectorAll('input, textarea, select').forEach(el => {
                if (el.type === 'checkbox' || el.type === 'radio') {
                    el.checked = false;
                } else if (el.id !== 'p_age') {
                    el.value = '';
                }
            });
            document.querySelectorAll('[id$="_wrap"]').forEach(w => w.classList.add('hidden'));
            refreshAll();
        });
    }

    // ===================== INIT =====================
    loadState();
    updateNotes();
});
