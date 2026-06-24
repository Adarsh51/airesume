document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('jobContainer');
  const jobId = container.dataset.jobId;

  const pageLoading = document.getElementById('pageLoading');
  const pageContent = document.getElementById('pageContent');
  
  const jobTitleDisplay = document.getElementById('jobTitleDisplay');
  const jobDate = document.getElementById('jobDate');
  const candidateCount = document.getElementById('candidateCount');
  const jobSkills = document.getElementById('jobSkills');
  const jobDescriptionDisplay = document.getElementById('jobDescriptionDisplay');
  const jobDescriptionContainer = document.getElementById('jobDescriptionContainer');
  
  const rankingsTableBody = document.getElementById('rankingsTableBody');
  const emptyRankings = document.getElementById('emptyRankings');

  const drawer = document.getElementById('candidateDrawer');
  const drawerOverlay = document.getElementById('drawerOverlay');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');
  const drawerContent = document.getElementById('drawerContent');

  let currentRankings = [];

  // ---- LOAD DATA ----
  async function loadJobData() {
    try {
      const data = await apiRequest(`/api/admin/jobs/${jobId}/rankings`);
      const { job, rankings } = data;
      currentRankings = rankings;

      // Render Job Details
      jobTitleDisplay.textContent = job.title;
      jobDate.textContent = formatDate(job.created_at);
      candidateCount.textContent = `${rankings.length} candidate${rankings.length !== 1 ? 's' : ''}`;
      
      jobSkills.innerHTML = job.required_skills.split(',').map(s => 
        `<span class="px-3 py-1 bg-primary/10 text-primary font-label-md rounded-full text-sm border border-primary/20">${s.trim()}</span>`
      ).join('');

      if (job.description) {
        jobDescriptionDisplay.textContent = job.description;
        jobDescriptionContainer.classList.remove('hidden');
      }

      // Render Rankings
      renderRankings(rankings);

      pageLoading.classList.add('hidden');
      pageContent.classList.remove('hidden');
      pageContent.style.display = 'flex';

    } catch (error) {
      pageLoading.innerHTML = `
        <div class="text-error mb-4"><span class="material-symbols-outlined text-[48px]">error</span></div>
        <p class="text-on-surface font-headline-md mb-2">Error Loading Data</p>
        <p class="text-on-surface-variant">${error.message}</p>
        <a href="/admin" class="btn-primary mt-6">Back to Dashboard</a>
      `;
    }
  }

  function renderRankings(rankings) {
    if (!rankings || rankings.length === 0) {
      document.querySelector('table').parentElement.classList.add('hidden');
      emptyRankings.classList.remove('hidden');
      emptyRankings.style.display = 'flex';
      return;
    }

    rankingsTableBody.innerHTML = rankings.map((r, index) => `
      <tr class="border-b border-outline-variant/20 hover:bg-surface-container-lowest/50 transition-colors cursor-pointer group" onclick="openCandidateDetails('${r.resume_id}')">
        <td class="px-6 py-4">
          <div class="w-8 h-8 rounded-full ${index === 0 ? 'bg-[#FFD700]/20 text-[#B8860B]' : index === 1 ? 'bg-[#C0C0C0]/20 text-[#708090]' : index === 2 ? 'bg-[#CD7F32]/20 text-[#8B4513]' : 'bg-surface-container text-on-surface-variant'} flex items-center justify-center font-label-md mx-auto">
            ${index + 1}
          </div>
        </td>
        <td class="px-6 py-4">
          <div class="font-label-md text-on-surface">${r.candidate_name}</div>
          <div class="text-xs text-on-surface-variant">${r.email || 'No email'}</div>
        </td>
        <td class="px-6 py-4">
          <div class="flex items-center gap-2">
            <div class="w-16 h-2 bg-surface-container rounded-full overflow-hidden">
              <div class="h-full bg-primary" style="width: ${r.match_score}%"></div>
            </div>
            <span class="font-label-sm">${Math.round(r.match_score)}%</span>
          </div>
        </td>
        <td class="px-6 py-4">
          <span class="font-label-sm ${r.ats_score >= 80 ? 'text-[#1B5E20]' : r.ats_score >= 60 ? 'text-[#B8860B]' : 'text-error'}">${r.ats_score}/100</span>
        </td>
        <td class="px-6 py-4">
          <span class="px-2 py-1 rounded-md text-xs font-label-sm ${getRecommendationBadge(r.recommendation)}">
            ${r.recommendation}
          </span>
        </td>
        <td class="px-6 py-4 text-right">
          <button class="btn-icon text-on-surface-variant group-hover:text-primary transition-colors" aria-label="View Details">
            <span class="material-symbols-outlined">chevron_right</span>
          </button>
        </td>
      </tr>
    `).join('');
  }

  function getRecommendationBadge(rec) {
    if (rec.includes('Highly')) return 'bg-[#1B5E20]/10 text-[#1B5E20]';
    if (rec.includes('Consider')) return 'bg-[#B8860B]/10 text-[#B8860B]';
    if (rec.includes('Not')) return 'bg-error/10 text-error';
    return 'bg-primary/10 text-primary';
  }

  // ---- DRAWER LOGIC ----
  window.openCandidateDetails = function(resumeId) {
    const r = currentRankings.find(x => x.resume_id === resumeId);
    if (!r) return;

    drawerContent.innerHTML = `
      <!-- Header Info -->
      <div class="flex items-center gap-4 mb-2">
        <div class="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-display text-2xl">
          ${r.candidate_name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h3 class="font-headline-md text-on-surface">${r.candidate_name}</h3>
          <p class="text-sm text-on-surface-variant flex items-center gap-4">
            <span><span class="material-symbols-outlined text-[14px] align-middle">mail</span> ${r.email || 'N/A'}</span>
            <span><span class="material-symbols-outlined text-[14px] align-middle">phone</span> ${r.phone || 'N/A'}</span>
          </p>
        </div>
      </div>

      <!-- Scores Grid -->
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-surface-container rounded-xl p-4 text-center border border-outline-variant/20">
          <p class="text-sm text-on-surface-variant mb-1">Match Score</p>
          <p class="font-display text-3xl text-primary">${Math.round(r.match_score)}<span class="text-lg text-on-surface-variant">%</span></p>
        </div>
        <div class="bg-surface-container rounded-xl p-4 text-center border border-outline-variant/20">
          <p class="text-sm text-on-surface-variant mb-1">ATS Format Score</p>
          <p class="font-display text-3xl ${r.ats_score >= 80 ? 'text-[#1B5E20]' : 'text-[#B8860B]'}">${r.ats_score}<span class="text-lg text-on-surface-variant">/100</span></p>
        </div>
      </div>

      <!-- Recommendation -->
      <div class="p-4 rounded-xl ${getRecommendationBadge(r.recommendation)} border border-current/20 flex items-start gap-3">
        <span class="material-symbols-outlined">lightbulb</span>
        <div>
          <p class="font-label-md">AI Recommendation</p>
          <p class="text-sm opacity-90">${r.recommendation}</p>
        </div>
      </div>

      <!-- Skills -->
      <div>
        <h4 class="font-label-md text-on-surface mb-3 flex items-center gap-2">
          <span class="material-symbols-outlined text-[18px]">check_circle</span> Matched Skills
        </h4>
        <div class="flex flex-wrap gap-2">
          ${r.matched_skills ? r.matched_skills.split(',').map(s => 
            `<span class="px-2 py-1 bg-[#1B5E20]/10 text-[#1B5E20] border border-[#1B5E20]/20 rounded-md text-xs font-label-md">${s.trim()}</span>`
          ).join('') : '<span class="text-sm text-on-surface-variant">None</span>'}
        </div>
      </div>

      <div class="mt-2">
        <h4 class="font-label-md text-on-surface mb-3 flex items-center gap-2">
          <span class="material-symbols-outlined text-[18px]">cancel</span> Missing Skills
        </h4>
        <div class="flex flex-wrap gap-2">
          ${r.missing_skills ? r.missing_skills.split(',').map(s => 
            `<span class="px-2 py-1 bg-error/10 text-error border border-error/20 rounded-md text-xs font-label-md">${s.trim()}</span>`
          ).join('') : '<span class="text-sm text-on-surface-variant">None</span>'}
        </div>
      </div>
    `;

    drawerOverlay.classList.remove('hidden');
    // small timeout to allow display:block to apply before opacity transition
    setTimeout(() => {
      drawerOverlay.classList.remove('opacity-0');
      drawer.classList.remove('translate-x-full');
    }, 10);
  };

  function closeDrawer() {
    drawer.classList.add('translate-x-full');
    drawerOverlay.classList.add('opacity-0');
    setTimeout(() => {
      drawerOverlay.classList.add('hidden');
    }, 300);
  }

  closeDrawerBtn.addEventListener('click', closeDrawer);
  drawerOverlay.addEventListener('click', closeDrawer);

  // Init
  loadJobData();
});
