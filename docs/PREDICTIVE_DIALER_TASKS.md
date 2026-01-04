# Predictive Dialer - Remaining Tasks & Deferred Items

## Feature #3692 Status: Core Logic Implemented

The core predictive dialing logic has been implemented in `PredictiveDialingService` and `PredictivePacerService`. The dialing loop is active and integrated with the `CallService`.

### 1. Refine Metric Gathering (High Priority)
The current `PredictiveDialingService.gatherMetrics` is functional but naive.
- [ ] **Campaign Filtering**: Ensure `CallService.getActiveCalls()` can accurately filter calls by campaign ID. Currently relying on Organization ID.
- [ ] **Agent Availability**: Integrate `AgentStateService` to get real-time "Ready" agent counts. Currently assuming all active agents are available if not talking.
- [ ] **Queue Stats**: If agents are in queues, query `QueueService` for precise stats.

### 2. Answering Machine Detection (AMD) (Critical)
Predictive dialing relies heavily on filtering out voicemail.
- [ ] **Asterisk/Mediasoup AMD**: Configure AMD in the `CallService` or `AsteriskAdapter` when initiating predictive calls.
- [ ] **Handling**: Logic to drop AMD calls or route to a message, and only bridge human answers to agents.

### 3. Agent Bridging (Critical)
- [ ] **Reserve Agent**: When a call is answered, ensuring an agent is *immediately* reserved and bridged.
- [ ] **Pre-connect**: Consider "power dialing" where agents are locked *before* dial if latency is too high.

### 4. Frontend Integration
- [ ] **Campaign UI**: Add "Predictive" as a Dialing Mode option.
- [ ] **Configuration**: UI inputs for `Target Abandonment Rate`, `Max Concurrent Calls`, `Lines Per Agent`.
- [ ] **Real-time Monitor**: Dashboard showing Pacing Algorithm status (Current Pace, Abandonment Rate).

### 5. Testing
- [ ] **Load Testing**: Simulate 100+ concurrent calls to verify `PredictivePacerService` stability.
- [ ] **End-to-End**: Test with real SIP trunks and softphones.
