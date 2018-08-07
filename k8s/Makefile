DEPLOYMENT := `kubectl get deploy -l app=master-studio -o custom-columns=NAME:.metadata.name --no-headers`
POD := `kubectl get pods -o=custom-columns=NAME:.metadata.name --field-selector=status.phase=Running --no-headers -l app=master-studio | head -n 1`

master-shell:
	kubectl rollout status deployment/$(DEPLOYMENT)
	echo Running bash inside $(POD)
	kubectl exec -it $(POD) bash
