type RequestRow = {
  method: string;
  url: string;
  timestamp: string;
};

const seedRows: RequestRow[] = [];
const listEl = document.getElementById("request-list");

if (!listEl) {
  throw new Error("Missing request list element");
}

const render = (rows: RequestRow[]) => {
  if (rows.length === 0) {
    listEl.innerHTML = '<li class="placeholder">No traffic captured yet.</li>';
    return;
  }

  listEl.innerHTML = rows
    .map(
      (row) =>
        `<li><strong>${row.method}</strong> <span>${row.url}</span> <small>${row.timestamp}</small></li>`
    )
    .join("");
};

render(seedRows);