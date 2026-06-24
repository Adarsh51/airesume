document.addEventListener('DOMContentLoaded', async () => {
  const jobForm = document.getElementById('jobForm');
  const jobTitle = document.getElementById('jobTitle');
  const skillsInput = document.getElementById('skillsInput');
  const skillTags = document.getElementById('skillTags');
  const jobDescription = document.getElementById('jobDescription');
  const saveJobBtn = document.getElementById('saveJobBtn');
  
  const jobsLoading = document.getElementById('jobsLoading');
  const emptyState = document.getElementById('emptyState');
  const jobsList = document.getElementById('jobsList');
  const jobsCount = document.getElementById('jobsCount');

  let currentSkills = [];

  // ---- SKILLS INPUT ----
  skillsInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill(skillsInput.value);
    }
  });

  skillsInput.addEventListener('blur', () => {
    addSkill(skillsInput.value);
  });

  function addSkill(val) {
    const skill = val.replace(/,/g, '').trim();
    if (skill && !currentSkills.includes(skill)) {
      currentSkills.push(skill);
      renderSkillTags();
    }
    skillsInput.value = '';
    checkFormValid();
  }

  function removeSkill(skill) {
    currentSkills = currentSkills.filter(s => s !== skill);
    renderSkillTags();
    checkFormValid();
  }

  window.removeSkill = removeSkill; // Expose to global for onclick

  function renderSkillTags() {
    skillTags.innerHTML = currentSkills.map(skill => `
      <span class="inline-flex items-center gap-1 px-3 py-1 bg-surface-container-high text-on-surface font-label-md rounded-full border border-outline-variant/50">
        ${skill} 
        <button type="button" class="material-symbols-outlined text-[16px] hover:text-error" onclick="removeSkill('${skill}')">close</button>
      </span>
    `).join('');
  }

  function checkFormValid() {
    saveJobBtn.disabled = !(jobTitle.value.trim() && currentSkills.length > 0);
  }

  jobTitle.addEventListener('input', checkFormValid);

  // ---- CREATE JOB ----
  jobForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (saveJobBtn.disabled) return;

    showLoading('Creating job posting...');

    try {
      await apiRequest('/api/jobs', {
        method: 'POST',
        body: JSON.stringify({
          title: jobTitle.value.trim(),
          description: jobDescription.value.trim(),
          required_skills: currentSkills.join(', ')
        })
      });

      hideLoading();
      showToast('Job created successfully!', 'success');
      
      // Reset form
      jobForm.reset();
      currentSkills = [];
      renderSkillTags();
      checkFormValid();

      // Reload jobs
      loadJobs();

    } catch (error) {
      hideLoading();
      showToast(error.message || 'Failed to create job', 'error');
    }
  });

  // ---- LOAD JOBS ----
  async function loadJobs() {
    jobsLoading.classList.remove('hidden');
    emptyState.classList.add('hidden');
    jobsList.classList.add('hidden');

    try {
      const data = await apiRequest('/api/jobs');
      const jobs = data.jobs || [];
      
      jobsCount.textContent = `${jobs.length} job${jobs.length !== 1 ? 's' : ''}`;

      if (jobs.length === 0) {
        jobsLoading.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
      }

      jobsList.innerHTML = jobs.map(job => `
        <div class="p-5 border border-outline-variant/30 rounded-xl hover:bg-surface-container-low transition-colors cursor-pointer group" onclick="window.location.href='/admin/jobs/${job.id}'">
          <div class="flex justify-between items-start mb-2">
            <h3 class="font-headline-md text-on-surface group-hover:text-primary transition-colors">${job.title}</h3>
            <span class="text-xs text-on-surface-variant font-label-md">${formatDate(job.created_at)}</span>
          </div>
          <p class="text-sm text-on-surface-variant mb-3 line-clamp-2">${job.description || 'No description provided.'}</p>
          <div class="flex flex-wrap gap-1">
            ${job.required_skills.split(',').slice(0, 5).map(s => `
              <span class="px-2 py-0.5 bg-surface-container text-xs rounded-md text-on-surface-variant border border-outline-variant/20">${s.trim()}</span>
            `).join('')}
            ${job.required_skills.split(',').length > 5 ? `<span class="px-2 py-0.5 text-xs text-on-surface-variant">+${job.required_skills.split(',').length - 5} more</span>` : ''}
          </div>
        </div>
      `).join('');

      jobsLoading.classList.add('hidden');
      jobsList.classList.remove('hidden');
      jobsList.style.display = 'flex';

    } catch (error) {
      jobsLoading.classList.add('hidden');
      showToast('Failed to load jobs: ' + error.message, 'error');
    }
  }

  // Init
  loadJobs();
});
