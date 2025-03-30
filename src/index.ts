const arrow = document.querySelector('.js-arrow-down');
arrow?.addEventListener('click', () => {
  window.scroll({
    top: 10000,
    behavior: 'smooth',
  });
});
