// Refresh the toolbar appearance without reloading the extension or its running job.
chrome.action.setIcon({ path: {
  16: 'icons/red-white-16.png',
  32: 'icons/red-white-32.png',
  48: 'icons/red-white-48.png',
  128: 'icons/red-white-128.png'
} }).then(() => {
  document.getElementById('icon-result').textContent = 'อัปเดตไอคอนพื้นแดง ถังขยะสีขาวแล้ว';
}).catch(() => {
  document.getElementById('icon-result').textContent = 'โหลดส่วนขยายใหม่หลังรอบปัจจุบันหยุด เพื่ออัปเดตไอคอน';
});
