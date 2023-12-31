# psa-restricted-patcher

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=bryopsida_psa-restricted-patcher&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=bryopsida_psa-restricted-patcher) [![Coverage](https://sonarcloud.io/api/project_badges/measure?project=bryopsida_psa-restricted-patcher&metric=coverage)](https://sonarcloud.io/summary/new_code?id=bryopsida_psa-restricted-patcher) [![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=bryopsida_psa-restricted-patcher&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=bryopsida_psa-restricted-patcher) [![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=bryopsida_psa-restricted-patcher&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=bryopsida_psa-restricted-patcher) [![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=bryopsida_psa-restricted-patcher&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=bryopsida_psa-restricted-patcher) [![Bugs](https://sonarcloud.io/api/project_badges/measure?project=bryopsida_psa-restricted-patcher&metric=bugs)](https://sonarcloud.io/summary/new_code?id=bryopsida_psa-restricted-patcher)

## NPM Scripts

The following scripts are available

- `lint` lints the source code using eslint
- `lint:fix` automatically fixes any lint errors that can be fixed automatically
- `test` uses jest to run test suites
- `test:e2e` runs e2e test suite, this requires an active helm:deploy
- `build` compiles the typescript into js and places it in the `dist` folder
- `build:image` builds the container image
- `build:docs` builds the api docs
- `minikube:start` create a minikube k8s cluster
- `minikube:stop` stop minikube but do not delete
- `minikube:delete` delete the minikube cluster
- `helm:addRepos` adds helm repos
- `helm:deployCertManager` deploy cert-manager for TLS
- `helm:deploy` deploy the app to k8s using helm
- `helm:template` print the k8s yaml that would be applied to k8s when using `helm:deploy`
- `helm:uninstall` remove the app from k8s
- `helm:uninstallCertManager` remove cert-manager from the k8s cluster

## Deploy it

If you don't already have cert manager installed you will need to run:

```bash
helm repo add jetstack https://charts.jetstack.io && helm repo update && \
  helm upgrade --install --namespace cert-manager --create-namespace \
  cert-manager jetstack/cert-manager --set installCRDs=true --debug --wait
```

Add the helm repos `helm repo add psa https://bryopsida.github.io/psa-restricted-patcher` fetch updates `helm repo update`.

Verify it worked `helm search repo psa` and you should see something like.

```
NAME                                                    CHART VERSION   APP VERSION     DESCRIPTION
psa/psa-restricted-patcher...      0.1.0           0.1.0          ...
```

Deploy the app `helm upgrade --install starter psa/psa-restricted-patcher`

Verify it worked `kubectl run testpod --image=busybox`, this will be changed, fetch it's yaml `kubectl get testpod -o yaml` you will see its `securityContext`'s have been enhanced.
