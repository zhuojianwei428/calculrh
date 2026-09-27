/* ==========================================================================
   法国 HR 计算器站 — 共享脚本
   - 导航 / 年份
   - 四大计算器引擎 (真实法国劳动法公式, 带法律出处与 disclaimer)
   系数经 2026-09-27 核验: acquisition = 2,5 j/mois plafond 30 (L3141-1/3),
   适用 temps plein ET temps partiel; fractionnement = jours sup. si prise hors
   période principale (1 mai→31 oct): +1 j (3-5 j) / +2 j (≥6 j); indemnité = 1/10
   rémunération brute (L3141-22/24).
   ========================================================================== */

(function () {
  "use strict";

  // ---- 通用 ----
  document.getElementById("y").textContent = new Date().getFullYear();

  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () { nav.classList.toggle("open"); });
  }

  var eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
  var num = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
  function val(id) {
    var el = document.getElementById(id);
    if (!el) return NaN;
    var v = parseFloat(String(el.value).replace(/\s/g, "").replace(",", "."));
    return isNaN(v) ? NaN : v;
  }
  function set(id, txt) { var el = document.getElementById(id); if (el) el.innerHTML = txt; }
  function show(id) { var el = document.getElementById(id); if (el) el.style.display = ""; }
  function hide(id) { var el = document.getElementById(id); if (el) el.style.display = "none"; }
  function line(label, val) {
    return '<div class="result-line"><span>' + label + '</span><b>' + val + "</b></div>";
  }

  /* ======================================================================
     1) Congés payés assistante maternelle
     - Jours acquis: 2,5 j × mois travaillés, plafond 30 j (L3141-1/3)
       → temps plein ET temps partiel identiques (L3123-5)
     - Jours de fractionnement (bonus): +1 j si 3-5 j pris hors période
       principale (1 mai→31 oct), +2 j si ≥6 j (L3141-13)
     - Indemnité: 1/10 de la rémunération brute totale (L3141-22/24)
     ====================================================================== */
  function initCPAssmat() {
    if (!document.getElementById("cp_mois")) return;
    var horsRow = document.getElementById("cp_hors_row");
    var horsToggle = document.getElementById("cp_hors");
    if (horsToggle && horsRow) {
      horsToggle.addEventListener("change", function () {
        horsToggle.checked ? show("cp_hors_row") : hide("cp_hors_row");
      });
    }
    function calc() {
      var mois = val("cp_mois");
      var totalBrut = val("cp_brut");
      if (isNaN(mois) || mois <= 0) { set("cp_out", '<p class="result-empty">Saisissez le nombre de mois travaillés.</p>'); return; }

      var acquis = Math.min(2.5 * mois, 30);

      var bonus = 0;
      if (horsToggle && horsToggle.checked) {
        var h = val("cp_hors_n");
        if (!isNaN(h) && h >= 6) bonus = 2;
        else if (!isNaN(h) && h >= 3) bonus = 1;
      }

      var indem = (!isNaN(totalBrut) && totalBrut > 0) ? totalBrut / 10 : null;

      var html = "";
      html += line("Jours acquis (2,5 j × mois, plafond 30)", num.format(acquis) + " j");
      if (bonus > 0) {
        html += line("Jours de fractionnement (pris hors période)", "+" + bonus + " j");
        html += line("Total jours (acquis + fractionnement)", num.format(acquis + bonus) + " j");
      }
      html += line("Équivalence jours ouvrés (×5/6)", num.format(Math.round(acquis * 5 / 6 * 10) / 10) + " j");
      if (indem !== null) {
        html += line("Indemnité CP (1/10 rémunération)", eur.format(indem));
        html += line("Indemnité par jour", eur.format(indem / Math.max(acquis + bonus, 1)));
      }
      set("cp_out", html);
    }
    ["cp_mois", "cp_brut", "cp_hors_n"].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.addEventListener("input", calc);
    });
    if (horsToggle) horsToggle.addEventListener("change", calc);
    calc();
  }

  /* ======================================================================
     2) Indemnité de fin de contrat (prime de précarité, CDD)
     - 1/10 de la rémunération brute totale (L1243-8)
     - Exclue: CDD de remplacement (substitution)
     ====================================================================== */
  function initIndemnite() {
    if (!document.getElementById("ifdc_brut")) return;
    var rempl = document.getElementById("ifdc_remplacement");
    function calc() {
      var brut = val("ifdc_brut");
      if (isNaN(brut) || brut <= 0) { set("ifdc_out", '<p class="result-empty">Saisissez la rémunération brute totale du contrat.</p>'); return; }
      var exclu = rempl && rempl.checked;
      var prime = exclu ? 0 : brut / 10;
      var html = "";
      html += line("Prime de précarité (1/10)", eur.format(prime));
      if (exclu) html += line("CDD de remplacement", "Exonéré (L1243-8)");
      else html += line("Base de calcul", eur.format(brut));
      set("ifdc_out", html);
    }
    var el = document.getElementById("ifdc_brut"); if (el) el.addEventListener("input", calc);
    if (rempl) rempl.addEventListener("change", calc);
    calc();
  }

  /* ======================================================================
     3) Salaire net assistante maternelle (estimation)
     - Net = Brut − cotisations salariales (taux indicatif, editable)
     - Coût employeur = Brut + cotisations patronales (taux indicatif)
     ⚠ taux indicatifs — à vérifier avant mise en ligne
     ====================================================================== */
  function initSalaireNet() {
    if (!document.getElementById("sn_brut")) return;
    function calc() {
      var brut = val("sn_brut");
      var tS = val("sn_tx_sal"); if (isNaN(tS)) tS = 9.27;
      var tP = val("sn_tx_pat"); if (isNaN(tP)) tP = 18.47;
      if (isNaN(brut) || brut <= 0) { set("sn_out", '<p class="result-empty">Saisissez le salaire brut.</p>'); return; }
      var net = brut * (1 - tS / 100);
      var cout = brut * (1 + tP / 100);
      var html = "";
      html += line("Salaire net à payer (estimé)", eur.format(net));
      html += line("Cotisations salariales (" + num.format(tS) + "%)", "− " + eur.format(brut * tS / 100));
      html += line("Coût employeur (estimé, " + num.format(tP) + "%)", eur.format(cout));
      set("sn_out", html);
    }
    ["sn_brut", "sn_tx_sal", "sn_tx_pat"].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.addEventListener("input", calc);
    });
    calc();
  }

  /* ======================================================================
     4) Jours de CP acquis (quick)
     - 2,5 j × mois travaillés, plafond 30 j (L3141-1/3)
     ====================================================================== */
  function initJoursCP() {
    if (!document.getElementById("jc_mois")) return;
    function calc() {
      var mois = val("jc_mois");
      if (isNaN(mois) || mois <= 0) { set("jc_out", '<p class="result-empty">Saisissez le nombre de mois.</p>'); return; }
      var jours = Math.min(2.5 * mois, 30);
      set("jc_out", line("Jours de CP acquis", num.format(jours) + " j") +
        line("Plafond légal", "30 j / période"));
    }
    var el = document.getElementById("jc_mois"); if (el) el.addEventListener("input", calc);
    calc();
  }

  initCPAssmat();
  initIndemnite();
  initSalaireNet();
  initJoursCP();
})();
