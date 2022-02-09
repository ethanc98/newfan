const arrow = document.querySelector('.arrow');

arrow.addEventListener('click', () => {
    console.log('arrow clicked');
    window.scroll({
        top: 10000,
        behavior: 'smooth'
    })
});