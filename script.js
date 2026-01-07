const $ = (id) => document.getElementById(id);

const input = $("password");
const toggleBtn = $("toggle");
const meterFill = $("meterFill");
const labelEl = $("label");
const scoreEl = $("score");
const entropyEl = $("entropy");
const feedbackEl = $("feedback");
const copyLink = $("copyLink");

const COMMON_WORDS = [
  "password", "pass", "admin", "welcome", "letmein", "qwerty",
  "iloveyou", "monkey", "dragon", "football", "baseball", "shadow",
  "login", "master", "hello", "freedom"
];

const KEYBOARD_PATTERNS = ["qwerty", "asdf", "zxcv", "12345", "09876"];

function charsetSize(pw) {
  let size = 0;
  const notes = [];

  const hasLower = /[a-z]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  const hasDigit = /[0-9]/.test(pw);
  const hasSymbol = /[^A-Za-z0-9]/.test(pw);

  if (hasLower) size += 26; else notes.push("Add lowercase letters (a–z).");
  if (hasUpper) size += 26; else notes.push("Add uppercase letters (A–Z).");
  if (hasDigit) size += 10; else notes.push("Add digits (0–9).");
  if (hasSymbol) size += 32; else notes.push("Add symbols (e.g., !@#£%).");

  return { size: Math.max(size, 1), notes };
}

function entropyBits(length, charset) {
  // entropy ≈ length * log2(charset)
  return length * Math.log2(charset);
}

function hasRepeats(pw) {
  // 3+ same char in a row OR repeated chunks like abababab
  return /(.)\1\1/.test(pw) || /(.{2,4})\1\1/.test(pw);
}

function hasSequences(pw) {
  const p = pw.toLowerCase();
  const alpha = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";

  for (let i = 0; i < alpha.length - 3; i++) {
    if (p.includes(alpha.slice(i, i + 4))) return true;
  }
  for (let i = 0; i < digits.length - 3; i++) {
    if (p.includes(digits.slice(i, i + 4))) return true;
  }
  return false;
}

function commonPenalty(pw) {
  const p = pw.toLowerCase();
  let penalty = 0;

  for (const w of COMMON_WORDS) if (p.includes(w)) penalty += 20;
  for (const pat of KEYBOARD_PATTERNS) if (p.includes(pat)) penalty += 15;

  // year patterns (e.g., 1999, 2004, 2024)
  if (/(19\d{2}|20\d{2})/.test(p)) penalty += 8;

  return penalty;
}

function lengthScore(len, feedback) {
  let delta = 0;
  if (len < 8) {
    delta -= 25;
    feedback.push("Use at least 12 characters (8 is a bare minimum).");
  } else if (len < 12) {
    delta += 5;
    feedback.push("Good start — aim for 12–16+ characters for stronger security.");
  } else if (len < 16) {
    delta += 15;
  } else {
    delta += 20;
  }
  return delta;
}

function labelFor(score) {
  if (score < 25) return "Very Weak";
  if (score < 45) return "Weak";
  if (score < 65) return "Fair";
  if (score < 85) return "Strong";
  return "Very Strong";
}

function fillClass(label) {
  switch (label) {
    case "Very Weak": return "fill-veryweak";
    case "Weak": return "fill-weak";
    case "Fair": return "fill-fair";
    case "Strong": return "fill-strong";
    default: return "fill-verystrong";
  }
}

function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}

function renderFeedback(items) {
  feedbackEl.innerHTML = "";
  if (!items.length) {
    const li = document.createElement("li");
    li.textContent = "Looks good — no obvious weak patterns detected.";
    feedbackEl.appendChild(li);
    return;
  }
  for (const msg of items) {
    const li = document.createElement("li");
    li.textContent = msg;
    feedbackEl.appendChild(li);
  }
}

function evaluate(pw) {
  const feedback = [];
  if (!pw) {
    return { score: 0, label: "Very Weak", entropy: 0, feedback: ["Password is empty."] };
  }

  let score = 50;

  // length
  score += lengthScore(pw.length, feedback);

  // charset + entropy
  const cs = charsetSize(pw);
  feedback.push(...cs.notes);

  const ent = entropyBits(pw.length, cs.size);

  // entropy contribution (cap so it doesn't dominate)
  // ~ 0-80 bits gets up to +25 points
  score += clamp((ent / 80) * 25, 0, 25);

  // penalties
  const penalty = commonPenalty(pw);
  if (penalty > 0) feedback.push("Avoid common words/keyboard patterns (e.g., password, qwerty, asdf).");
  score -= penalty;

  if (hasRepeats(pw)) {
    score -= 10;
    feedback.push("Avoid repeated characters or repeated chunks (e.g., aaa, ababab).");
  }
  if (hasSequences(pw)) {
    score -= 10;
    feedback.push("Avoid sequences (e.g., abcd, 1234).");
  }

  // small bonus if it includes spaces (passphrases)
  if (/\s/.test(pw) && pw.length >= 14) {
    score += 6;
    feedback.push("Nice: passphrases with spaces can be strong and memorable.");
  }

  score = clamp(Math.round(score), 0, 100);
  const lab = labelFor(score);

  return { score, label: lab, entropy: ent, feedback };
}

function updateUI() {
  const pw = input.value;
  const { score, label, entropy, feedback } = evaluate(pw);

  labelEl.textContent = label;
  scoreEl.textContent = `Score: ${score}/100`;
  entropyEl.textContent = `Entropy: ${entropy.toFixed(1)} bits`;

  meterFill.style.width = `${score}%`;
  meterFill.className = `meterFill ${fillClass(label)}`;

  renderFeedback(feedback);
}

toggleBtn.addEventListener("click", () => {
  const isHidden = input.type === "password";
  input.type = isHidden ? "text" : "password";
  toggleBtn.textContent = isHidden ? "Hide" : "Show";
  toggleBtn.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
});

input.addEventListener("input", updateUI);

copyLink.addEventListener("click", async (e) => {
  e.preventDefault();
  const example = "Correct Horse Battery Staple! 7";
  try {
    await navigator.clipboard.writeText(example);
    alert("Copied example password to clipboard.");
  } catch {
    alert("Could not access clipboard (browser blocked). Example: " + example);
  }
});

// initial render
updateUI();
