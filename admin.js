const pass = 'yourStrongPassword';
const loginBtn = document.getElementById('loginBtn');
loginBtn.onclick = () => {
  if(document.getElementById('adminPass').value === pass){
    document.getElementById('loginDiv').classList.add('hidden');
    document.getElementById('panelDiv').classList.remove('hidden');
  } else {
    document.getElementById('loginMsg').textContent = 'Wrong password';
  }
};

document.getElementById('addItemBtn').onclick = () => {
  const catName = document.getElementById('newCategory').value;
  const category = data.categories.find(c=>c.name===catName) || {name: catName, items: []};
  if(!data.categories.includes(category)) data.categories.push(category);
  category.items.push({
    name: document.getElementById('newName').value,
    serial: document.getElementById('newSerial').value,
    price: +document.getElementById('newPrice').value,
    variants: document.getElementById('newVariants').value.split(',').map(v=>v.trim()),
    currentVar: 0
  });
  alert('Item added');
};
