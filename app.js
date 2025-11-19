const form = document.getElementById("expense-form");
const formModeBadge = document.getElementById("form-mode");
const submitLabel = document.getElementById("submit-label");
const tableBody = document.getElementById("expense-table-body");
const categoryBreakdown = document.getElementById("category-breakdown");
const spendingHealthList = document.getElementById("spending-health");

const filterForm = document.getElementById("filter-form");
const filterInputs = {
  search: document.getElementById("filter-search"),
  category: document.getElementById("filter-category"),
  start: document.getElementById("filter-start"),
  end: document.getElementById("filter-end"),
  payment: document.getElementById("filter-payment"),
  sort: document.getElementById("filter-sort"),
};

const statTotal = document.getElementById("stat-total");
const statAverage = document.getElementById("stat-average");
const statLargest = document.getElementById("stat-largest");

const btnClearAll = document.getElementById("btn-clear-all");
const btnClearFilters = document.getElementById("btn-clear-filters");
const btnExport = document.getElementById("btn-export");
const navAddExpenseBtn = document.getElementById("nav-add-expense");
const calcDisplay = document.getElementById("calc-display");
const calcButtons = document.querySelectorAll(".calc-btn");
const navCountrySelect = document.getElementById("nav-country");
const brandFlag = document.getElementById("brand-flag");
const brandCountryName = document.getElementById("brand-country-name");
const heroCountryLabel = document.getElementById("hero-country");
const heroRegionText = document.getElementById("hero-region");
const amountCurrencyCode = document.getElementById("amount-currency-code");

const STORAGE_KEY = "smart-expense-calculator";
const STORAGE_COUNTRY_KEY = `${STORAGE_KEY}-country`;
let expenses = [];
let editingId = null;
let calcExpression = "0";

const categoryOptions = [
  "Housing",
  "Transportation",
  "Food",
  "Utilities",
  "Health",
  "Shopping",
  "Entertainment",
  "Travel",
  "Education",
  "Savings",
  "Other",
];

const paymentOptions = [
  "Cash",
  "Debit Card",
  "Credit Card",
  "Online Transfer",
  "Wallet",
];

const COUNTRY_PROFILES = [
  { code: "US", name: "United States", flag: "🇺🇸", currency: "USD", locale: "en-US" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", currency: "GBP", locale: "en-GB" },
  { code: "IN", name: "India", flag: "🇮🇳", currency: "INR", locale: "en-IN" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪", currency: "AED", locale: "ar-AE" },
  { code: "AU", name: "Australia", flag: "🇦🇺", currency: "AUD", locale: "en-AU" },
  { code: "CA", name: "Canada", flag: "🇨🇦", currency: "CAD", locale: "en-CA" },
];

let activeCountry = COUNTRY_PROFILES[0];
let currencyFormatter = new Intl.NumberFormat(activeCountry.locale, {
  style: "currency",
  currency: activeCountry.currency,
});

function initSelectOptions(select, values, hasPlaceholder = false) {
  select.innerHTML = hasPlaceholder ? select.innerHTML : "";
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function populateCountrySelect(select) {
  if (!select) return;
  select.innerHTML = "";
  COUNTRY_PROFILES.forEach((profile) => {
    const option = document.createElement("option");
    option.value = profile.code;
    option.textContent = `${profile.flag} ${profile.name}`;
    select.appendChild(option);
  });
}

function getCountryProfile(code) {
  return COUNTRY_PROFILES.find((profile) => profile.code === code) ?? COUNTRY_PROFILES[0];
}

function updateCurrencyFormatter() {
  currencyFormatter = new Intl.NumberFormat(activeCountry.locale, {
    style: "currency",
    currency: activeCountry.currency,
  });
}

function updateCountryUI() {
  if (brandFlag) brandFlag.textContent = activeCountry.flag;
  if (brandCountryName) brandCountryName.textContent = activeCountry.name;
  if (heroCountryLabel) heroCountryLabel.textContent = activeCountry.name;
  if (amountCurrencyCode) amountCurrencyCode.textContent = activeCountry.currency;
  if (navCountrySelect && navCountrySelect.value !== activeCountry.code) {
    navCountrySelect.value = activeCountry.code;
  }
}

function setActiveCountry(code, { skipPersist = false, skipRender = false } = {}) {
  activeCountry = getCountryProfile(code);
  updateCurrencyFormatter();
  updateCountryUI();
  if (!skipPersist) {
    localStorage.setItem(STORAGE_COUNTRY_KEY, activeCountry.code);
  }
  if (!skipRender) {
    render();
  }
}

function loadStoredCountryPreference() {
  const storedCode = localStorage.getItem(STORAGE_COUNTRY_KEY);
  if (storedCode) {
    setActiveCountry(storedCode, { skipPersist: true, skipRender: true });
  } else {
    setActiveCountry(activeCountry.code, { skipPersist: true, skipRender: true });
  }
  updateCountryUI();
}

function formatCurrency(value) {
  const numeric = Number(value) || 0;
  return currencyFormatter.format(numeric);
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

function loadFromStorage() {
  const data = localStorage.getItem(STORAGE_KEY);
  expenses = data ? JSON.parse(data) : [];
}

function resetFormState() {
  editingId = null;
  formModeBadge.textContent = "Add Mode";
  formModeBadge.classList.remove("text-bg-warning");
  formModeBadge.classList.add("text-bg-primary");
  submitLabel.textContent = "Add Expense";
  form.reset();
}

function validateForm() {
  let isValid = true;
  form.querySelectorAll("input, select").forEach((input) => {
    if (!input.checkValidity()) {
      isValid = false;
    }
    input.classList.add("was-validated");
  });
  return isValid;
}

function getFormData() {
  return {
    id: editingId ?? crypto.randomUUID(),
    description: document.getElementById("description").value.trim(),
    amount: Number(document.getElementById("amount").value),
    date: document.getElementById("date").value,
    category: document.getElementById("category").value,
    paymentMethod: document.getElementById("payment-method").value,
    notes: document.getElementById("notes").value.trim(),
    type: Number(document.getElementById("amount").value) >= 0 ? "expense" : "income",
  };
}

function handleSubmit(e) {
  e.preventDefault();
  if (!form.checkValidity()) {
    e.stopPropagation();
    form.classList.add("was-validated");
    return;
  }

  const expense = getFormData();

  if (editingId) {
    expenses = expenses.map((item) => (item.id === editingId ? expense : item));
  } else {
    expenses.unshift(expense);
  }

  saveToStorage();
  render();
  resetFormState();
}

function applyFilters(data) {
  return data
    .filter((item) => {
      const { search, category, start, end, payment } = filterInputs;
      const searchText = search.value.toLowerCase();
      const matchesSearch =
        !searchText ||
        item.description.toLowerCase().includes(searchText) ||
        item.notes.toLowerCase().includes(searchText);

      const matchesCategory = !category.value || item.category === category.value;
      const matchesPayment = !payment.value || item.paymentMethod === payment.value;

      const matchesStart = !start.value || item.date >= start.value;
      const matchesEnd = !end.value || item.date <= end.value;

      return matchesSearch && matchesCategory && matchesPayment && matchesStart && matchesEnd;
    })
    .sort((a, b) => {
      const sortValue = filterInputs.sort.value;
      switch (sortValue) {
        case "date-asc":
          return a.date.localeCompare(b.date);
        case "date-desc":
          return b.date.localeCompare(a.date);
        case "amount-asc":
          return a.amount - b.amount;
        case "amount-desc":
          return b.amount - a.amount;
        default:
          return 0;
      }
    });
}

function renderTable(data) {
  tableBody.innerHTML = "";

  if (!data.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted py-4">
          No expenses match your filters.
        </td>
      </tr>
    `;
    return;
  }

  data.forEach((expense, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td class="fw-semibold">${expense.description}</td>
      <td><span class="badge text-bg-light text-dark">${expense.category}</span></td>
      <td>${expense.paymentMethod}</td>
      <td class="fw-bold ${expense.amount >= 0 ? "text-danger" : "text-success"}">
        ${formatCurrency(expense.amount)}
      </td>
      <td>${new Date(expense.date).toLocaleDateString()}</td>
      <td class="text-truncate" style="max-width: 12rem;">${expense.notes || "-"}</td>
      <td class="text-end">
        <button class="action-btn me-2" data-action="edit" data-id="${expense.id}">
          <i class="bi bi-pencil-square"></i>
        </button>
        <button class="action-btn text-danger" data-action="delete" data-id="${expense.id}">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

function renderStats(data) {
  if (!data.length) {
    statTotal.textContent = formatCurrency(0);
    statAverage.textContent = formatCurrency(0);
    statLargest.textContent = formatCurrency(0);
    return;
  }

  const amounts = data.map((item) => item.amount);
  const total = amounts.reduce((sum, value) => sum + value, 0);
  const average = total / data.length;
  const largest = Math.max(...amounts);

  statTotal.textContent = formatCurrency(total);
  statAverage.textContent = formatCurrency(average);
  statLargest.textContent = formatCurrency(largest);
}

function renderCategoryBreakdown(data) {
  categoryBreakdown.innerHTML = "";

  if (!data.length) {
    categoryBreakdown.innerHTML = "<p class='text-muted mb-0'>No data yet.</p>";
    return;
  }

  const totals = data.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.amount;
    return acc;
  }, {});

  const totalSpent = Object.values(totals).reduce((sum, value) => sum + value, 0);

  Object.entries(totals)
    .sort(([, a], [, b]) => b - a)
    .forEach(([category, amount]) => {
      const percentage = totalSpent ? ((amount / totalSpent) * 100).toFixed(1) : 0;
      const row = document.createElement("div");
      row.className = "category-row";
      row.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-2">
          <div class="fw-semibold">${category}</div>
          <div class="text-muted small">${percentage}%</div>
        </div>
        <div class="progress mb-2">
          <div class="progress-bar" role="progressbar" style="width: ${percentage}%"></div>
        </div>
        <div class="fw-bold">${formatCurrency(amount)}</div>
      `;
      categoryBreakdown.appendChild(row);
    });
}

function renderSpendingHealth(data) {
  spendingHealthList.innerHTML = "";

  if (!data.length) {
    spendingHealthList.innerHTML = "<li class='text-muted'>Add expenses to see personalized tips.</li>";
    return;
  }

  const total = data.reduce((sum, item) => sum + item.amount, 0);
  const tipItems = [];

  if (total > 1000) {
    tipItems.push("Spending over $1000. Consider reviewing recurring costs.");
  }

  const categoryTotals = data.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.amount;
    return acc;
  }, {});

  const topCategory = Object.entries(categoryTotals).sort(([, a], [, b]) => b - a)[0];

  if (topCategory) {
    tipItems.push(`High spending detected in ${topCategory[0]}. Set a budget target.`);
  }

  if (!tipItems.length) {
    tipItems.push("Great job keeping expenses diversified and under control.");
  }

  tipItems.forEach((tip) => {
    const li = document.createElement("li");
    li.className = "mb-2";
    li.innerHTML = `<i class="bi bi-lightbulb text-warning me-2"></i>${tip}`;
    spendingHealthList.appendChild(li);
  });
}

function render() {
  const filtered = applyFilters([...expenses]);
  renderTable(filtered);
  renderStats(filtered);
  renderCategoryBreakdown(filtered);
  renderSpendingHealth(filtered);
}

function updateCalculatorDisplay(value) {
  if (!calcDisplay) return;
  calcDisplay.value = value ?? (calcExpression || "0");
}

function clearCalculator() {
  calcExpression = "0";
  updateCalculatorDisplay();
}

function deleteCalculatorChar() {
  if (calcExpression.length <= 1) {
    calcExpression = "0";
  } else {
    calcExpression = calcExpression.slice(0, -1);
  }
  updateCalculatorDisplay();
}

function appendCalculatorValue(value) {
  if (!calcDisplay) return;
  const operators = ["+", "-", "*", "/"];
  const lastChar = calcExpression.slice(-1);

  if (operators.includes(value)) {
    if (operators.includes(lastChar)) {
      calcExpression = calcExpression.slice(0, -1) + value;
    } else {
      calcExpression += value;
    }
    updateCalculatorDisplay();
    return;
  }

  if (value === ".") {
    const segments = calcExpression.split(/[\+\-\*\/]/);
    const currentSegment = segments[segments.length - 1];
    if (currentSegment.includes(".")) {
      return;
    }
  }

  if (calcExpression === "0" && value !== ".") {
    calcExpression = value;
  } else {
    calcExpression += value;
  }
  updateCalculatorDisplay();
}

function applyPercentage() {
  const match = calcExpression.match(/(-?\d+(\.\d+)?)$/);
  if (!match) return;
  const number = parseFloat(match[0]) / 100;
  calcExpression = `${calcExpression.slice(0, -match[0].length)}${number}`;
  updateCalculatorDisplay();
}

function evaluateCalculator() {
  const sanitized = calcExpression.replace(/[^0-9+\-*/.]/g, "");
  if (!sanitized) return;

  try {
    const result = Function(`"use strict"; return (${sanitized});`)();
    calcExpression = Number.isFinite(result) ? result.toString() : "0";
    updateCalculatorDisplay();
  } catch (error) {
    updateCalculatorDisplay("Error");
    setTimeout(() => updateCalculatorDisplay(calcExpression), 1000);
  }
}

function handleCalculatorButtonClick(event) {
  const button = event.currentTarget;
  const action = button.dataset.action;
  const value = button.dataset.value;

  switch (action) {
    case "clear":
      clearCalculator();
      break;
    case "delete":
      deleteCalculatorChar();
      break;
    case "equals":
      evaluateCalculator();
      break;
    default:
      if (value === "%") {
        applyPercentage();
      } else if (value) {
        appendCalculatorValue(value);
      }
      break;
  }
}

function handleTableClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const id = button.dataset.id;

  if (action === "edit") {
    const expense = expenses.find((item) => item.id === id);
    if (!expense) return;
    editingId = id;
    formModeBadge.textContent = "Edit Mode";
    formModeBadge.classList.remove("text-bg-primary");
    formModeBadge.classList.add("text-bg-warning");
    submitLabel.textContent = "Save Changes";

    document.getElementById("description").value = expense.description;
    document.getElementById("amount").value = expense.amount;
    document.getElementById("date").value = expense.date;
    document.getElementById("category").value = expense.category;
    document.getElementById("payment-method").value = expense.paymentMethod;
    document.getElementById("notes").value = expense.notes;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (action === "delete") {
    const confirmDelete = confirm("Delete this expense?");
    if (!confirmDelete) return;
    expenses = expenses.filter((item) => item.id !== id);
    saveToStorage();
    render();
  }
}

function clearAllData() {
  if (!expenses.length) return;
  if (confirm("This will remove every saved expense. Continue?")) {
    expenses = [];
    saveToStorage();
    render();
    resetFormState();
  }
}

function clearFilters() {
  filterInputs.search.value = "";
  filterInputs.category.value = "";
  filterInputs.start.value = "";
  filterInputs.end.value = "";
  filterInputs.payment.value = "";
  filterInputs.sort.value = "date-desc";
  render();
}

function exportCSV() {
  if (!expenses.length) {
    alert("No expenses to export yet.");
    return;
  }

  const headers = [
    "Description",
    "Amount",
    "Date",
    "Category",
    "Payment Method",
    "Notes",
  ];

  const rows = expenses.map((expense) => [
    expense.description,
    expense.amount,
    expense.date,
    expense.category,
    expense.paymentMethod,
    expense.notes.replace(/"/g, '""'),
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "expenses.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function registerEventListeners() {
  form.addEventListener("submit", handleSubmit);
  form.addEventListener("reset", resetFormState);
  tableBody.addEventListener("click", handleTableClick);
  btnClearAll.addEventListener("click", clearAllData);
  btnClearFilters.addEventListener("click", clearFilters);
  btnExport.addEventListener("click", exportCSV);

  filterForm.addEventListener("input", () => render());

  if (navAddExpenseBtn) {
    navAddExpenseBtn.addEventListener("click", () => {
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  if (navCountrySelect) {
    navCountrySelect.addEventListener("change", (event) => {
      setActiveCountry(event.target.value);
    });
  }

  calcButtons.forEach((btn) => btn.addEventListener("click", handleCalculatorButtonClick));
}

function initialize() {
  initSelectOptions(filterInputs.category, categoryOptions, true);
  initSelectOptions(filterInputs.payment, paymentOptions, true);
  populateCountrySelect(navCountrySelect);
  loadFromStorage();
  loadStoredCountryPreference();
  registerEventListeners();
  updateCalculatorDisplay();
  render();
}

initialize();

