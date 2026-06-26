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

  function getStatusHtml(r) {
    const status = (r.status || 'pending').toLowerCase();
    if (status === 'accepted') {
      return `<span class="px-3 py-1.5 rounded-lg text-xs font-label-md bg-[#4CAF50]/15 text-[#4CAF50] border border-[#4CAF50]/30 inline-flex items-center gap-1">
        <span class="material-symbols-outlined text-[14px]">check_circle</span> Accepted
      </span>`;
    }
    if (status === 'rejected') {
      return `<span class="px-3 py-1.5 rounded-lg text-xs font-label-md bg-error/10 text-error border border-error/20 inline-flex items-center gap-1">
        <span class="material-symbols-outlined text-[14px]">cancel</span> Rejected
      </span>`;
    }
    // pending — show accept/reject buttons
    return `
      <div class="flex items-center gap-2 justify-center">
        <button onclick="event.stopPropagation(); updateStatus('${r.resume_id}', 'accepted')" class="px-3 py-1.5 rounded-lg text-xs font-label-md bg-[#4CAF50]/15 text-[#4CAF50] border border-[#4CAF50]/40 hover:bg-[#4CAF50]/25 transition-colors inline-flex items-center gap-1" title="Accept">
          <span class="material-symbols-outlined text-[14px]">check</span> Accept
        </button>
        <button onclick="event.stopPropagation(); updateStatus('${r.resume_id}', 'rejected')" class="px-3 py-1.5 rounded-lg text-xs font-label-md bg-error/10 text-error border border-error/30 hover:bg-error/20 transition-colors inline-flex items-center gap-1" title="Reject">
          <span class="material-symbols-outlined text-[14px]">close</span> Reject
        </button>
      </div>
    `;
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
          <span class="px-2 py-1 rounded-md text-xs font-label-sm ${getRecommendationBadge(r.recommendation)}">
            ${r.recommendation}
          </span>
        </td>
        <td class="px-6 py-4 text-center" id="status-${r.resume_id}">
          ${getStatusHtml(r)}
        </td>
      </tr>
    `).join('');
  }

  function getRecommendationBadge(rec) {
    if (!rec) return 'bg-primary/10 text-primary';
    if (rec.includes('Highly')) return 'bg-[#4CAF50]/15 text-[#4CAF50]';
    if (rec.includes('Consider')) return 'bg-[#B8860B]/10 text-[#B8860B]';
    if (rec.includes('Not')) return 'bg-error/10 text-error';
    return 'bg-primary/10 text-primary';
  }

  // ---- STATUS UPDATE ----
  window.updateStatus = async function(resumeId, status) {
    try {
      await apiRequest(`/api/admin/resumes/${resumeId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });

      // Update in-memory data
      const r = currentRankings.find(x => x.resume_id === resumeId);
      if (r) r.status = status;

      // Update the cell in-place
      const cell = document.getElementById(`status-${resumeId}`);
      if (cell) cell.innerHTML = getStatusHtml(r);

      showToast(`Candidate ${status}!`, 'success');
    } catch (error) {
      showToast(error.message || 'Failed to update status', 'error');
    }
  };

  // ---- DRAWER LOGIC ----
  window.openCandidateDetails = function(resumeId) {
    const r = currentRankings.find(x => x.resume_id === resumeId);
    if (!r) return;

    const statusLabel = (r.status || 'pending').toLowerCase();
    const statusBadge = statusLabel === 'accepted' 
      ? '<span class="px-3 py-1.5 rounded-lg text-sm font-label-md bg-[#4CAF50]/15 text-[#4CAF50] border border-[#4CAF50]/30 inline-flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">check_circle</span> Accepted</span>'
      : statusLabel === 'rejected'
      ? '<span class="px-3 py-1.5 rounded-lg text-sm font-label-md bg-error/10 text-error border border-error/20 inline-flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">cancel</span> Rejected</span>'
      : '<span class="px-3 py-1.5 rounded-lg text-sm font-label-md bg-surface-container text-on-surface-variant border border-outline-variant/30 inline-flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">schedule</span> Pending</span>';

    const name = r.candidate_name || 'Unknown';
    const firstLetter = name.trim().charAt(0).toUpperCase() || '?';
    const escapedName = name.replace(/'/g, "\\'");

    drawerContent.innerHTML = `
      <!-- Header Info -->
      <div class="flex items-center gap-4 mb-2">
        <div class="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-display text-2xl">
          ${firstLetter}
        </div>
        <div>
          <h3 class="font-headline-md text-on-surface">${name}</h3>
          <p class="text-sm text-on-surface-variant flex items-center gap-4">
            <span><span class="material-symbols-outlined text-[14px] align-middle">mail</span> ${r.email || 'N/A'}</span>
            <span><span class="material-symbols-outlined text-[14px] align-middle">phone</span> ${r.phone || 'N/A'}</span>
          </p>
        </div>
      </div>

      <!-- Status & Score -->
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-surface-container rounded-xl p-4 text-center border border-outline-variant/20">
          <p class="text-sm text-on-surface-variant mb-1">Match Score</p>
          <p class="font-display text-3xl text-primary">${Math.round(r.match_score || 0)}<span class="text-lg text-on-surface-variant">%</span></p>
        </div>
        <div class="bg-surface-container rounded-xl p-4 text-center border border-outline-variant/20 flex flex-col items-center justify-center">
          <p class="text-sm text-on-surface-variant mb-2">Status</p>
          ${statusBadge}
        </div>
      </div>

      <!-- Recommendation -->
      <div class="p-4 rounded-xl ${getRecommendationBadge(r.recommendation)} border border-current/20 flex items-start gap-3">
        <span class="material-symbols-outlined">lightbulb</span>
        <div>
          <p class="font-label-md">AI Recommendation</p>
          <p class="text-sm opacity-90">${r.recommendation || 'N/A'}</p>
        </div>
      </div>

      <!-- Skills -->
      <div>
        <h4 class="font-label-md text-on-surface mb-3 flex items-center gap-2">
          <span class="material-symbols-outlined text-[18px]">check_circle</span> Matched Skills
        </h4>
        <div class="flex flex-wrap gap-2">
          ${r.matched_skills ? r.matched_skills.split(',').map(s => 
            `<span class="px-2 py-1 bg-[#4CAF50]/15 text-[#4CAF50] border border-[#4CAF50]/20 rounded-md text-xs font-label-md">${s.trim()}</span>`
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

      <!-- PDF Actions -->
      <div class="flex gap-3 mt-4 pt-4 border-t border-outline-variant/20">
        <button onclick="openPdfModal('${r.resume_id}', '${escapedName}')" class="btn-outline flex-1 justify-center text-primary border-primary hover:bg-primary/10">
          <span class="material-symbols-outlined">visibility</span> View Resume
        </button>
        <a href="/api/admin/resumes/${r.resume_id}/file?download=true" class="btn-outline flex-1 justify-center text-primary border-primary hover:bg-primary/10 text-center flex items-center gap-2 no-underline" download>
          <span class="material-symbols-outlined">download</span> Download
        </a>
      </div>

      <!-- Accept/Reject Actions in Drawer -->
      ${statusLabel === 'pending' ? `
      <div class="flex gap-3 mt-4">
        <button onclick="updateStatus('${r.resume_id}', 'accepted'); closeDrawer();" class="btn-primary flex-1 justify-center bg-[#4CAF50] hover:bg-[#66BB6A]">
          <span class="material-symbols-outlined">check_circle</span> Accept Candidate
        </button>
        <button onclick="updateStatus('${r.resume_id}', 'rejected'); closeDrawer();" class="btn-outline flex-1 justify-center border-error text-error hover:bg-error/10">
          <span class="material-symbols-outlined">cancel</span> Reject Candidate
        </button>
      </div>` : ''}
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

  window.closeDrawer = closeDrawer;
  closeDrawerBtn.addEventListener('click', closeDrawer);
  drawerOverlay.addEventListener('click', closeDrawer);

  // ---- PDF MODAL LOGIC ----
  const pdfModal = document.getElementById('pdfModal');
  const pdfModalContent = document.getElementById('pdfModalContent');
  const pdfViewer = document.getElementById('pdfViewer');
  const closePdfModalBtn = document.getElementById('closePdfModal');
  const pdfModalTitle = document.getElementById('pdfModalTitle');
  const pdfDownloadBtn = document.getElementById('pdfDownloadBtn');
  const pdfLoading = document.getElementById('pdfLoading');

  window.openPdfModal = function(resumeId, candidateName) {
    pdfModalTitle.textContent = `${candidateName} - Resume`;
    pdfDownloadBtn.href = `/api/admin/resumes/${resumeId}/file?download=true`;
    
    // Show loading spinner
    pdfLoading.classList.remove('hidden');
    pdfViewer.classList.add('opacity-0');
    
    // Set iframe source
    pdfViewer.src = `/api/admin/resumes/${resumeId}/file`;
    
    // Hide loading when iframe loads
    pdfViewer.onload = () => {
      pdfLoading.classList.add('hidden');
      pdfViewer.classList.remove('opacity-0');
    };

    pdfModal.classList.remove('hidden');
    setTimeout(() => {
      pdfModal.classList.remove('opacity-0');
      pdfModalContent.classList.remove('scale-95');
    }, 10);
  };

  function closePdfModal() {
    pdfModal.classList.add('opacity-0');
    pdfModalContent.classList.add('scale-95');
    setTimeout(() => {
      pdfModal.classList.add('hidden');
      pdfViewer.src = ''; // Clear iframe memory
    }, 300);
  }

  closePdfModalBtn.addEventListener('click', closePdfModal);
  pdfModal.addEventListener('click', (e) => {
    if (e.target === pdfModal) closePdfModal();
  });

  // Init
  loadJobData();
});
