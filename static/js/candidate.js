document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('candidateForm');
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const filePreview = document.getElementById('filePreview');
  const removeFileBtn = document.getElementById('removeFile');
  const submitBtn = document.getElementById('submitBtn');
  const successState = document.getElementById('successState');
  const resetBtn = document.getElementById('resetBtn');
  
  const jobIdSelect = document.getElementById('jobId');
  
  let selectedFile = null;

  // ---- FETCH JOBS ----
  async function loadJobs() {
    try {
      const data = await apiRequest('/api/jobs');
      const jobs = data.jobs || [];
      
      if (jobs.length === 0) {
        jobIdSelect.innerHTML = '<option value="" disabled selected>No open roles available</option>';
        jobIdSelect.disabled = true;
      } else {
        jobIdSelect.innerHTML = '<option value="" disabled selected>Select Job to Apply For</option>' + 
          jobs.map(job => `<option value="${job.id}">${job.title}</option>`).join('');
      }
    } catch (error) {
      showToast('Failed to load jobs.', 'error');
    }
  }

  loadJobs();

  // ---- FILE UPLOAD ----
  dropZone.addEventListener('click', () => fileInput.click());
  
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
  });
  
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.add('border-primary', 'bg-primary/5'));
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove('border-primary', 'bg-primary/5'));
  });

  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt.files && dt.files.length > 0) {
      handleFile(dt.files[0]);
    }
  });

  fileInput.addEventListener('change', function() {
    if (this.files && this.files.length > 0) {
      handleFile(this.files[0]);
    }
  });

  function handleFile(file) {
    if (file.type !== 'application/pdf') {
      showToast('Please upload a PDF file only', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('File size must be under 10MB', 'error');
      return;
    }
    selectedFile = file;
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = formatFileSize(file.size);
    filePreview.classList.remove('hidden');
    dropZone.classList.add('hidden');
    checkFormValid();
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
    return (bytes/(1024*1024)).toFixed(1) + ' MB';
  }

  removeFileBtn.addEventListener('click', () => {
    selectedFile = null;
    fileInput.value = '';
    filePreview.classList.add('hidden');
    dropZone.classList.remove('hidden');
    checkFormValid();
  });

  // ---- FORM VALIDATION ----
  function checkFormValid() {
    const isFormValid = document.getElementById('candidateName').value.trim() !== '' &&
                        document.getElementById('candidateEmail').value.trim() !== '' &&
                        jobIdSelect.value !== '' &&
                        selectedFile !== null;
    
    submitBtn.disabled = !isFormValid;
  }

  form.addEventListener('input', checkFormValid);

  // ---- FORM SUBMIT ----
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    showLoading('Uploading and parsing profile...');
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('name', document.getElementById('candidateName').value.trim());
    formData.append('email', document.getElementById('candidateEmail').value.trim());
    formData.append('phone', document.getElementById('candidatePhone').value.trim());
    formData.append('job_id', jobIdSelect.value);

    try {
      await apiRequest('/api/candidate/upload', {
        method: 'POST',
        body: formData // do not set Content-Type, browser will do it
      });

      hideLoading();
      form.classList.add('hidden');
      successState.classList.remove('hidden');
      showToast('Profile submitted successfully!', 'success');
      
    } catch (error) {
      hideLoading();
      showToast(error.message || 'Upload failed. Please try again.', 'error');
    }
  });

  // ---- RESET ----
  resetBtn.addEventListener('click', () => {
    form.reset();
    selectedFile = null;
    fileInput.value = '';
    filePreview.classList.add('hidden');
    dropZone.classList.remove('hidden');
    successState.classList.add('hidden');
    form.classList.remove('hidden');
    checkFormValid();
  });
});
