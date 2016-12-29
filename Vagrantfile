# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
    # Base box to build off, and download URL for when it doesn't exist on the user's system already
    config.vm.box = "calband/django"
    config.vm.box_url = "https://s3-us-west-1.amazonaws.com/calband-virtualboxes/calband_django.box"
    
    # Forward a port from the guest to the host, which allows us to access the ports
    # exposed by the VM from our local machine.
    config.vm.network :forwarded_port, guest: 8000, host: 8000
    
    # sync the current directory with the /vagrant directory on the virtual machine
    config.vm.synced_folder ".", "/vagrant", :mount_options => ["fmode=666"]
    
    # provision using Ansible
    config.vm.provision "ansible_local" do |ansible|
        ansible.playbook = "vagrant/playbook.yml"
        ansible.sudo = true
    end
end
