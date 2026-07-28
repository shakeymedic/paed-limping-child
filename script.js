
function copyRichText() {
    var el = document.getElementById('epr-output');
    if (!el) return;
    var htmlContent = el.innerHTML;
    var plainText = el.innerText;
    var copyBtn = document.getElementById('copy-rich-text-btn');
    function flashBtn(ok) {
        if (!copyBtn) return;
        var orig = copyBtn.textContent;
        copyBtn.textContent = ok ? '\u2713 Copied!' : 'Copy failed';
        copyBtn.style.background = ok ? '#16a34a' : '#dc2626';
        setTimeout(function() {
            copyBtn.textContent = orig;
            copyBtn.style.background = '';
        }, 1500);
    }
    if (navigator.clipboard && window.ClipboardItem) {
        navigator.clipboard.write([
            new ClipboardItem({
                'text/html':  new Blob([htmlContent], { type: 'text/html' }),
                'text/plain': new Blob([plainText],  { type: 'text/plain' })
            })
        ]).then(function() { flashBtn(true); })
          .catch(function() {
            navigator.clipboard.writeText(plainText)
                .then(function() { flashBtn(true); })
                .catch(function() { flashBtn(false); });
        });
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(plainText)
            .then(function() { flashBtn(true); })
            .catch(function() { flashBtn(false); });
    } else {
        try {
            var range = document.createRange();
            range.selectNodeContents(el);
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            document.execCommand('copy');
            sel.removeAllRanges();
            flashBtn(true);
        } catch(e) { flashBtn(false); }
    }
}

// ===================== STORAGE =====================
const STORAGE_KEY = 'paed_limp_data';

// ===================== COPY RICH TEXT (exact required implementation) =====================


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
    function esc(str) {
        if (str === undefined || str === null) return '';
        return String(str);
    }

    function ph(text) {
        return `<span style="color:#94a3b8">[${text || 'not recorded'}]</span>`;
    }

    function fieldVal(v, placeholder) {
        return (v !== undefined && v !== null && v !== '') ? esc(v) : ph(placeholder);
    }

    function heading(text) {
        return `<br><b style="font-weight:bold;">${text}</b><br>`;
    }

    function updateNotes() {
        let n = '';
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' });
        const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

        n += `<b style="font-weight:bold;">LIMPING CHILD ASSESSMENT</b> <span style="font-size:0.85em;color:#64748b;">[${dateStr} ${timeStr}]</span><br>`;

        // --- Patient summary ---
        n += heading('PATIENT SUMMARY');
        n += `Name: ${fieldVal(val('p_name'))} | DOB: ${fieldVal(val('p_dob'))} | Age: ${fieldVal(val('p_age'))} | Weight: ${val('p_weight') ? esc(val('p_weight')) + ' kg' : ph('not recorded')} | Gender: ${fieldVal(val('p_gender'))}<br>`;
        n += `Side affected: ${fieldVal(findCheckedRadio('side_affected'))} | Onset: ${fieldVal(findCheckedRadio('onset'))} | Duration: ${fieldVal(val('duration_symptoms'))}<br>`;
        n += `Referral source: ${fieldVal(val('p_referral'))}<br>`;
        n += `Presenting complaint: ${fieldVal(val('presenting_complaint'))}<br>`;

        // --- History ---
        n += heading('HISTORY');
        const painLoc = checkedValues('.pain-loc');
        n += `Pain location: ${painLoc.length ? esc(painLoc.join(', ')) : ph('not specified')} | Character: ${fieldVal(val('pain_character'))} | Score: ${val('pain_score') ? esc(val('pain_score')) + '/10' : ph('not recorded')}<br>`;
        const wb = findCheckedRadio('weight_bearing');
        const wbText = wb === 'Non-weight-bearing'
            ? `<span style="color:#dc2626;font-weight:bold">⚠️ POSITIVE: Non-weight-bearing</span>`
            : fieldVal(wb);
        n += `Weight bearing: ${wbText}<br>`;
        const feverPresent = findCheckedRadio('fever_present');
        const feverText = feverPresent === 'Yes'
            ? `<span style="color:#d97706;font-weight:bold">⚠️ Yes</span>${val('fever_temp') ? ' (' + esc(val('fever_temp')) + '°C)' : ''}`
            : fieldVal(feverPresent);
        n += `Fever: ${feverText}${val('fever_temp') && feverPresent !== 'Yes' ? ' | Temperature: ' + esc(val('fever_temp')) : ''}<br>`;
        const illness = findCheckedRadio('recent_illness');
        n += `Recent URTI: ${fieldVal(illness === 'Yes' ? 'Yes' + (val('illness_ago') ? ' (' + val('illness_ago') + ')' : '') : illness)} | `;
        const trauma = findCheckedRadio('recent_trauma');
        n += `Recent trauma: ${fieldVal(trauma === 'Yes' ? 'Yes — ' + val('trauma_details') : trauma)} | `;
        const vacc = findCheckedRadio('recent_vaccination');
        n += `Recent vaccination: ${fieldVal(vacc === 'Yes' ? 'Yes — ' + val('vaccination_which') + (val('vaccination_ago') ? ' (' + val('vaccination_ago') + ')' : '') : vacc)}<br>`;
        const stiff = findCheckedRadio('morning_stiffness');
        n += `Morning stiffness: ${fieldVal(stiff === 'Yes' ? 'Yes' + (val('stiffness_duration') ? ' (' + val('stiffness_duration') + ' min)' : '') : stiff)} | `;
        const nightPain = findCheckedRadio('night_pain');
        const nightPainText = nightPain === 'Yes'
            ? `<span style="color:#dc2626;font-weight:bold">⚠️ Yes</span>`
            : fieldVal(nightPain);
        n += `Night pain: ${nightPainText}<br>`;
        const constitutional = checkedValues('.constitutional');
        n += `Constitutional symptoms: ${constitutional.length ? esc(constitutional.join(', ')) : '<span style="color:#16a34a">None</span>'}<br>`;
        const pmh = checkedValues('.pmh');
        n += `Past history: ${pmh.length ? esc(pmh.join(', ')) : '<span style="color:#16a34a">None relevant</span>'}<br>`;

        // --- pGALS ---
        n += heading('pGALS SCREENING');
        const pgalsLine = (id, label) => {
            const el = $(id);
            const text = el && el.checked ? '<span style="color:#16a34a">Normal</span>' : ph('not performed');
            n += `${label}: ${text}<br>`;
        };
        pgalsLine('pgals_gait_normal', 'Gait');
        pgalsLine('pgals_arms_normal', 'Arms');
        pgalsLine('pgals_legs_normal', 'Legs');
        pgalsLine('pgals_spine_normal', 'Spine');
        n += `pGALS notes: ${fieldVal(val('pgals_notes'))}<br>`;

        // --- Examination ---
        n += heading('EXAMINATION');
        n += `Appearance: ${fieldVal(findCheckedRadio('general_appearance'))} | Temperature: ${val('exam_temp') ? esc(val('exam_temp')) + '°C' : ph('not recorded')} | HR: ${fieldVal(val('exam_hr'))}<br>`;
        const gait = checkedValues('.gait');
        n += `Gait: ${gait.length ? esc(gait.join(', ')) : '<span style="color:#16a34a">Normal</span>'}<br>`;
        const limbSigns = checkedValues('.limb-sign');
        n += `Affected limb: ${limbSigns.length ? `<span style="color:#dc2626;font-weight:bold">⚠️ POSITIVE: ${esc(limbSigns.join(', '))}</span>` : '<span style="color:#16a34a">No swelling/erythema/warmth/deformity</span>'}<br>`;
        n += `Hip examination: IR ${val('hip_ir') ? esc(val('hip_ir')) + '°' : ph('n/a')} | ER ${val('hip_er') ? esc(val('hip_er')) + '°' : ph('n/a')} | Flexion ${val('hip_flexion') ? esc(val('hip_flexion')) + '°' : ph('n/a')} | Abduction ${val('hip_abduction') ? esc(val('hip_abduction')) + '°' : ph('n/a')}<br>`;
        n += `Pain on movement: ${fieldVal(findCheckedRadio('hip_pain_movement'))} | Log roll: ${fieldVal(findCheckedRadio('log_roll'))} | FABER: ${fieldVal(findCheckedRadio('faber_test'))} | Thomas test: ${fieldVal(findCheckedRadio('thomas_test'))}<br>`;
        const legLength = findCheckedRadio('leg_length_discrepancy');
        n += `Leg length discrepancy: ${fieldVal(legLength === 'Yes' ? 'Yes' + (val('leg_length_measured') ? ' (' + val('leg_length_measured') + ' cm)' : '') : legLength)}<br>`;
        const kneeExam = checkedValues('.knee-exam');
        n += `Knee examination: ${kneeExam.length ? esc(kneeExam.join(', ')) : '<span style="color:#16a34a">Normal</span>'} | Spine: ${fieldVal(findCheckedRadio('spine_assessment'))}<br>`;
        n += `NOTE: Torsion can present as a limp — testes examined: ${ph('not recorded')}<br>`;

        // --- Kocher ---
        n += heading('KOCHER CRITERIA (Septic Arthritis of Hip)');
        const kFever = findCheckedRadio('kocher_fever');
        const kNwb = findCheckedRadio('kocher_nwb');
        const kEsr = findCheckedRadio('kocher_esr');
        const kWbc = findCheckedRadio('kocher_wbc');
        const kCrp = findCheckedRadio('kocher_crp');
        const kocherItem = (v) => v === 'Yes' ? `<span style="color:#dc2626;font-weight:bold">Yes</span>` : fieldVal(v);
        n += `Fever &gt;38.5°C: ${kocherItem(kFever)} | Non-weight bearing: ${kocherItem(kNwb)} | ESR ≥40: ${kocherItem(kEsr)} | WBC &gt;12: ${kocherItem(kWbc)} | CRP &gt;20: ${kocherItem(kCrp)}<br>`;
        const { score } = getKocherScore();
        const result = KOCHER_RESULTS[score] || KOCHER_RESULTS[0];
        let scoreColour = '#16a34a';
        let scoreText = `Low probability`;
        if (score === 2) { scoreColour = '#d97706'; scoreText = 'Moderate probability — consider aspiration'; }
        else if (score === 3 || score === 4) { scoreColour = '#dc2626'; scoreText = 'HIGH probability — urgent orthopaedics'; }
        else if (score === 5) { scoreColour = '#dc2626'; scoreText = 'TREAT AS SEPTIC ARTHRITIS — emergency orthopaedics'; }
        n += `Score: ${score}/5 — <span style="color:${scoreColour};font-weight:bold">${scoreText}</span> (${result.prob})<br>`;
        n += `<span style="color:#d97706;font-weight:bold">⚠️ NOTE: Septic arthritis can still be present in the absence of all criteria</span><br>`;

        // --- Investigations ---
        n += heading('INVESTIGATIONS');
        const bloods = checkedValues('.bloods');
        n += `Bloods ordered: ${bloods.length ? esc(bloods.join(', ')) : ph('none ordered')}<br>`;
        n += `Results: WBC ${fieldVal(val('result_wbc'))} | CRP ${fieldVal(val('result_crp'))} | ESR ${fieldVal(val('result_esr'))}<br>`;
        const xrayReq = findCheckedRadio('xray_requested');
        let xrayText;
        if (xrayReq === 'Yes') {
            const views = checkedValues('.xray-view');
            xrayText = `Yes${views.length ? ' — ' + esc(views.join(', ')) : ''}${val('xray_result') ? ' — Result: ' + esc(val('xray_result')) : ''}`;
        } else {
            xrayText = fieldVal(xrayReq);
        }
        n += `X-ray: ${xrayText}<br>`;
        const usReq = findCheckedRadio('us_hip_requested');
        let usText;
        if (usReq === 'Yes') {
            usText = `Yes — Effusion: ${fieldVal(findCheckedRadio('us_effusion'))}${val('us_volume') ? ' (' + esc(val('us_volume')) + ' ml)' : ''}`;
        } else {
            usText = fieldVal(usReq);
        }
        n += `Ultrasound hip: ${usText} | MRI: ${fieldVal(findCheckedRadio('mri_requested'))}<br>`;

        // --- Differential diagnosis ---
        n += heading('DIFFERENTIAL DIAGNOSIS');
        const mostLikely = val('most_likely_dx');
        n += `Most likely: ${fieldVal(mostLikely === 'Other (free text)' ? val('most_likely_dx_other') : mostLikely, 'not specified')}<br>`;
        const differentials = checkedValues('.differential');
        n += `Differentials: ${differentials.length ? esc(differentials.join(', ')) : ph('none selected')}<br>`;
        const ageYears = getAgeYears();
        let ageGroup = ph('age not recorded');
        if (ageYears !== null) {
            if (ageYears <= 3) ageGroup = '0–3yr differentials (transient synovitis, septic arthritis, DDH, toddler\'s fracture)';
            else if (ageYears <= 10) ageGroup = '3–10yr differentials (transient synovitis, Perthes disease, septic arthritis, JIA)';
            else ageGroup = '10–15yr differentials (SUFE, septic arthritis, JIA, overuse injury)';
        }
        n += `Age group differentials considered: ${ageGroup}<br>`;

        // --- Red flags ---
        n += heading('RED FLAGS');
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
        n += activeFlags.length
            ? `<span style="color:#dc2626;font-weight:bold">⚠️ ${esc(activeFlags.join(', '))}</span><br>`
            : `<span style="color:#16a34a">No red flags identified</span><br>`;

        // --- Management ---
        n += heading('MANAGEMENT &amp; DISPOSITION');
        const analgesia = findCheckedRadio('analgesia_given');
        n += `Analgesia: ${fieldVal(analgesia === 'Yes' ? 'Yes — ' + val('analgesia_details') : analgesia)}<br>`;
        const ortho = findCheckedRadio('ortho_referral');
        n += `Orthopaedics referral: ${fieldVal(ortho ? ortho + (val('ortho_urgency') ? ' (' + val('ortho_urgency') + ')' : '') : ortho)} | Rheumatology referral: ${fieldVal(findCheckedRadio('rheum_referral'))} | Haematology/Oncology referral: ${fieldVal(findCheckedRadio('haem_onc_referral'))}<br>`;
        const abx = findCheckedRadio('antibiotics_given');
        n += `Antibiotics: ${fieldVal(abx === 'Yes' ? 'Yes — ' + val('antibiotics_which') : abx)} | Joint aspiration: ${fieldVal(findCheckedRadio('joint_aspiration'))} | Disposition: ${fieldVal(val('disposition'))}<br>`;
        n += `Safety netting: ${fieldVal(findCheckedRadio('safety_netting'))} | Follow-up: ${fieldVal(val('followup_type') ? val('followup_type') + (val('followup_details') ? ' — ' + val('followup_details') : '') : '')}<br>`;
        n += `Responsible clinician: ${fieldVal(val('responsible_clinician'))} | Senior review: ${fieldVal(val('senior_review'))}<br>`;

        if ($('epr-output')) $('epr-output').innerHTML = n;
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
